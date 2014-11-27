(function($){
    app.controller = app.controller || {};
    app.controller.species = {

        //controller configuration should be set up in an app config file
        CONF: {
            FLIGHT_DATA_SRC: ""
        },

        pagecreate: function(){
            //fetch flight data from the server
            //load species data
            if(!app.storage.is('flight')) {
                $.mobile.loading("show");

                $.ajax({
                    url: this.CONF.FLIGHT_DATA_SRC,
                    dataType: 'jsonp',
                    async: false,
                    success: function (json) {
                        $.mobile.loading("hide");

                        var flight = optimiseData(json);
                        app.data.flight = flight;

                        function optimiseData(json){
                            //optimise data
                            var data = {};
                            for (var i = 0; i < json.length; i++){
                                var a = json[i];
                                data[a['s']] = data[a['s']] || {};
                                data[a['s']][a['m']] = a['c'];
                            }
                            return data;
                        }

                        //render flight data
                        app.controller.species.addFlightData();

                        //saves for quicker loading
                        app.storage.set('flight', flight);

                    }
                });
            } else {
                app.data.flight = app.storage.get('flight');
            }
        },

        pagecontainershow: function(event, ui){
            _log('species: pagecontainershow.');

            var species = app.controller.list.getCurrentSpecies();

            var heading = $('#species_heading');
            heading.text(species.common_name);

            this.renderSpecies(species);
        },

        /**
         * Renders the species profile page.
         * @param species
         */
        renderSpecies: function(species){
            var template = $('#species-template').html();
            var placeholder = $('#species-placeholder');

            var compiled_template = Handlebars.compile(template);

            //check for the favourite
            var favourites = app.controller.list.getFavourites();
            if (favourites[species.id] != null){
                $("#species-profile-fav-button").addClass("on");
            } else {
                $("#species-profile-fav-button").removeClass("on");
            }

            placeholder.html(compiled_template(species));
            placeholder.trigger('create');

            //add Flight data
            this.addFlightData();

            //add Gallery
            app.controller.species.gallery.init();

            //add button listeners
            $('#species-map-button, #species-map').on('click', function(){
                $('#species-map').toggle('slow');
            })
        },

        /**
         * Adds fight histograms to the species profile.
         */
        addFlightData: function(){
            var container = $('#species-flight');

            //if server data came earlier than the page was rendered
            if (container.length == 0){
                return;
            }
            var species = app.controller.list.getCurrentSpecies();
            var flight_data = app.data.flight[species.id];

            if(flight_data == null){
                _log('species: no filght data was found for: ' + species.id, app.LOG_ERROR);
                return;
            }

            var data = [];

            var WEEKS_IN_YEAR = 52;
            for (var i=0; i <  WEEKS_IN_YEAR; i++ ){
                data.push({
                    'x': i,
                    'y': flight_data[i] / 10|| 0
                });
            }
            this.renderFlightData(data);
        },

        /**
         * Creates SVG using D3 lib and attaches it to the Species profile.
         *
         * Code from: http://www.sitepoint.com/creating-simple-line-bar-charts-using-d3-js/
         */
        renderFlightData: function(barData){
            var container = $('#species-flight');


            var WIDTH = container.width(),
                HEIGHT = container.height(),
                MARGINS = {
                    top: 20,
                    right: 5,
                    bottom: 20,
                    left: 0
                },
                xRange = d3.scale.ordinal().rangeRoundBands([MARGINS.left, WIDTH - MARGINS.right], 0.1).domain(barData.map(function (d) {
                    return d.x;
                })),


                yRange = d3.scale.linear().range([HEIGHT - MARGINS.top, MARGINS.bottom]).domain([0,
                    d3.max(barData, function (d) {
                        return d.y;
                    })
                ]),

                xAxis = d3.svg.axis()
                    .scale(xRange)
                    .tickValues([1, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50]),

                yAxis = d3.svg.axis()
                    .scale(yRange)
                    .tickValues([0, 100])
                    .orient("left");

            // Add an SVG element with the desired dimensions and margin.
            var graph = d3.select("#species-flight").append("svg:svg")
                .attr("width", WIDTH + MARGINS.right + MARGINS.left)
                .attr("height", HEIGHT + MARGINS.top + MARGINS.bottom)
                .append("svg:g")
                .attr("transform", "translate(" + MARGINS.bottomleft + "," + MARGINS.top + ")");

            graph.append('svg:g')
                .attr('class', 'x axis')
                .attr('transform', 'translate(0,' + (HEIGHT - MARGINS.bottom) + ')')
                .call(xAxis);

            graph.selectAll('rect')
                .data(barData)
                .enter()
                .append('rect')
                .attr('x', function (d) {
                    return xRange(d.x);
                })
                .attr('y', function (d) {
                    return yRange(d.y);
                })
                .attr('width', xRange.rangeBand())
                .attr('height', function (d) {
                    return ((HEIGHT - MARGINS.bottom) - yRange(d.y));
                })
                .attr('fill', 'grey')
                .on('mouseover',function(d){
                    d3.select(this)
                        .attr('fill','blue');
                })
                .on('mouseout',function(d){
                    d3.select(this)
                        .attr('fill','grey');
                });


        },

        /**
         * Toggles the current species as favourite by saving it into the
         * storage and changing the buttons appearance.
         */
        toggleSpeciesFavourite: function(){
            var favButton = $("#species-profile-fav-button");
            favButton.toggleClass("on");

            var species = app.controller.list.getCurrentSpecies();
            app.controller.list.changeFavourite(species.id, favButton.hasClass('on'));
        },

        /**
         *
         */
        gallery: {

            gallery : {},
            init : function(gallery_id){
                var images = $('#species_gallery a');

                if (images.length > 0){
                    this.gallery =  images.photoSwipe({
                        jQueryMobile: true,
                        loop: false,
                        enableMouseWheel: false,
                        enableKeyboard: false
                    });
                }

            },

            show : function(){
                if ($('.gallery')){
                    this.gallery.show(0);
                } else {
                    app.navigation.message('I have no pictures to show :(');
                }

            }
        }
    };
}(jQuery));

