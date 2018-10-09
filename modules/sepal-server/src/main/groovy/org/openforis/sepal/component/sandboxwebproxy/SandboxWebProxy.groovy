package org.openforis.sepal.component.sandboxwebproxy


import io.undertow.Handlers
import io.undertow.Undertow
import io.undertow.UndertowOptions
import io.undertow.server.ExchangeCompletionListener
import io.undertow.server.HttpHandler
import io.undertow.server.HttpServerExchange
import io.undertow.server.ResponseCommitListener
import io.undertow.server.handlers.ResponseCodeHandler
import io.undertow.server.handlers.StuckThreadDetectionHandler
import io.undertow.server.session.InMemorySessionManager
import io.undertow.server.session.SessionAttachmentHandler
import io.undertow.server.session.SessionCookieConfig
import io.undertow.server.session.SessionManager
import io.undertow.util.HeaderMap
import io.undertow.util.HttpString
import org.openforis.sepal.component.sandboxwebproxy.api.SandboxSessionManager
import org.openforis.sepal.undertow.ExchangeReportingHandler
import org.openforis.sepal.util.NamedThreadFactory
import org.slf4j.Logger
import org.slf4j.LoggerFactory
import org.xnio.Options

import java.util.concurrent.Executors
import java.util.concurrent.ScheduledExecutorService
import java.util.concurrent.TimeUnit

/**
 * Proxy for web endpoints on user sandboxes. It provides the user a single, static url for each endpoint.
 * The proxy will make sure a sandbox is obtained, delegates requests to it.
 * <p>
 * Requests to this proxy requires two request headers:
 * <ul>
 * <li>{@code sepal-endpoint} - the name of the endpoint to proxy
 * <li>{@code sepal-user} - the username of the user who's sandbox to proxy
 * </ul>
 */
class SandboxWebProxy {

    private final Undertow server
    private final ScheduledExecutorService executor = Executors.newSingleThreadScheduledExecutor(
        NamedThreadFactory.singleThreadFactory('httpSessionMonitor')
    )
    private final int sessionHeartbeatInterval

    private final SessionManager httpSessionManager
    private final SandboxSessionManager sandboxSessionManager
    private final EndpointProvider endpointProvider

    private ExchangeReportingHandler exchangeReportingHandler = null

    /**
     * Creates the proxy.
     * @param port the port the proxy run on
     * @param portByEndpoint specifies which port each proxied endpoint run on
     * @param sandboxManager the sandbox manager used to obtain sandboxes.
     */
    SandboxWebProxy(int port, Map<String, Integer> portByEndpoint, SandboxSessionManager sandboxSessionManager,
                    int sessionHeartbeatInterval, int sessionDefaultTimeout) {
        this.sessionHeartbeatInterval = sessionHeartbeatInterval
        this.sandboxSessionManager = sandboxSessionManager
        httpSessionManager = new InMemorySessionManager('sandbox-web-proxy', 1000, true)
        httpSessionManager.setDefaultSessionTimeout(sessionDefaultTimeout)
        endpointProvider = new EndpointProvider(httpSessionManager, sandboxSessionManager, portByEndpoint)
        def processorCount = Runtime.getRuntime().availableProcessors()
        this.server = Undertow.builder()
            .addHttpListener(port, "0.0.0.0")
            .setHandler(createHandler(portByEndpoint))
            .setIoThreads(processorCount)
            .setWorkerThreads(processorCount * 32)
            .setWorkerThreads(1)
            .setSocketOption(Options.WRITE_TIMEOUT, 40 * 1000)
            .setServerOption(UndertowOptions.REQUEST_PARSE_TIMEOUT, 40 * 1000)
            .setServerOption(UndertowOptions.NO_REQUEST_TIMEOUT, 40 * 1000)
            .setServerOption(UndertowOptions.IDLE_TIMEOUT, 40 * 1000)
            .build()
    }

    private HttpHandler createHandler(Map<String, Integer> portByEndpoint) {
        def pathHandler = Handlers.path(ResponseCodeHandler.HANDLE_404)
        def handler = new RedirectRewriteHandler(
            new SandboxProxyHandler(endpointProvider)
        )
        portByEndpoint.keySet().each {
            pathHandler.addPrefixPath('/' + it, handler)
        }
        pathHandler.addExactPath('/start', new SandboxStartHandler(endpointProvider))

        exchangeReportingHandler = new ExchangeReportingHandler(
            new StuckThreadDetectionHandler(
                new BadRequestCatchingHandler(
                    new LoggingHandler(
                        new SessionAttachmentHandler(
                            pathHandler,
                            httpSessionManager,
                            new SessionCookieConfig(cookieName: "SANDBOX-SESSIONID", secure: false))))))
        return exchangeReportingHandler
    }

    void start() {
        server.start()
        exchangeReportingHandler.scheduleReport()
        executor.scheduleWithFixedDelay(
            endpointProvider.heartbeatSender(),
            sessionHeartbeatInterval,
            sessionHeartbeatInterval, TimeUnit.SECONDS
        )
    }

    void stop() {
        executor.shutdown()
        exchangeReportingHandler?.stop()
        server?.stop()
    }

    private static class LoggingHandler implements HttpHandler {
        private final static Logger LOG = LoggerFactory.getLogger(LoggingHandler)
        private final HttpHandler next

        LoggingHandler(HttpHandler next) {
            this.next = next
        }

        void handleRequest(HttpServerExchange exchange) throws Exception {
            LOG.debug("Handling request. exchange $exchange")
            exchange.addResponseCommitListener(new ResponseCommitListener() {
                void beforeCommit(HttpServerExchange ex) {
                    // Force applications to be allowed to run inside frames
                    ex.responseHeaders.remove(HttpString.tryFromString('X-Frame-Options'))
                    LOG.debug("Before response commit. statusCode: $ex.statusCode, exchange $ex")
                }
            })
            exchange.addExchangeCompleteListener(new ExchangeCompletionListener() {
                void exchangeEvent(HttpServerExchange ex, ExchangeCompletionListener.NextListener nextListener) {
                    LOG.debug("Exchange complete. statusCode: $ex.statusCode, exchange $ex")
                    nextListener.proceed()
                }
            })
            next.handleRequest(exchange)
        }
    }

    private static class RedirectRewriteHandler implements HttpHandler {
        private final HttpHandler next
        private final responseCommitListener = new Listener()

        RedirectRewriteHandler(HttpHandler next) {
            this.next = next
        }

        void handleRequest(HttpServerExchange exchange) throws Exception {
            exchange.addResponseCommitListener(responseCommitListener)
            next.handleRequest(exchange)
        }

        private static class Listener implements ResponseCommitListener {
            void beforeCommit(HttpServerExchange exchange) {
                HttpString locationHeaderName = HttpString.tryFromString("Location")
                HeaderMap headers = exchange.getResponseHeaders()
                String location = headers.getFirst(locationHeaderName)
                if (location != null) {
                    URI locationURI = URI.create(location)
                    if (locationURI.getHost() == null || locationURI.getHost().equals(exchange.getHostName())) {
                        String path = locationURI.getPath() == null ? "" : locationURI.getPath()
                        URI rewrittenURI = locationURI.resolve("/${extractEndpoint(exchange)}${path}")
                        headers.remove(locationHeaderName)
                        headers.add(locationHeaderName, rewrittenURI.toString())
                    }
                }
            }

            private static String extractEndpoint(HttpServerExchange exchange) {
                exchange.requestURI.find('/([^/]+)') { match, group -> group }
            }
        }
    }
}