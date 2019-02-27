#!/bin/bash
set -e

echo
echo "*****************************************"
echo "*** Installing R packages ***"
echo "*****************************************"
set -e
# libudunits2-dev required for udunits, needed by mapview
apt-get install -y \
    libudunits2-dev \
    r-cran-rmpi \
    libopenmpi-dev \
    libgeos++-dev

export JAVA_HOME=/usr/local/lib/sdkman/candidates/java/current
export JAVA_CPPFLAGS="-I${JAVA_HOME}/include -I${JAVA_HOME}/include/linux"
export JAVA_LD_LIBRARY_PATH=${JAVA_HOME}/jre/lib/amd64/server:${JAVA_HOME}/jre/lib/amd64
R CMD javareconf

R -e "install.packages('pacman', dependencies=TRUE, repos='http://cran.rstudio.com/')"
R -e "devtools::install_github('appelmar/strucchange')"
R -e "pacman::p_load_gh(\
        'appelmar/bfast',\
        'loicdtx/bfastSpatial'\
        'jreiche/bayts'\
    )"
R -e "pacman::p_load(\
        'corrplot',\
        'dismo',\
        'dplyr',\
        'DT',\
        'Formula',\
        'ggmap',\
        'ggplot2',\
        'htmltools',\
        'igraph',\
        'keras',\
        'knitr',\
        'leaflet',\
        'lubridate',\
        'maptools',\
        'mapview',\
        'plyr',\
        'random',\
        'randomForest',\
        'raster',\
        'RColorBrewer',\
        'rgdal',\
        'rgeos',\
        'rJava',\
        'Rmpi',\
        'rmarkdown',\
        'rPython',\
        'RSQLite',\
        'RStoolbox',\
        'sf',\
        'shiny',\
        'shinyBS',\
        'shinycssloaders',\
        'shinydashboard',\
        'shinyFiles',\
        'shinyjs',\
        'snow',\
        'sp',\
        'sqldf',\
        'stringr',\
        'strucchange',\
        'tictoc',\
        'tidyr',\
        'xtable',\
        'zoo'\
    )"
