package org.openforis.sepal.apigateway.server

import org.openforis.sepal.util.annotation.ImmutableData

@ImmutableData
class EndpointConfig {
    boolean https = true
    boolean authenticate = true
    boolean prefix
    String path
    URI target
}
