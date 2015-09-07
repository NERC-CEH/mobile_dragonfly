/******************************************************************************
 * Species page view.
 *****************************************************************************/
define([
    'views/_page',
    'templates',
    'd3',
    'photoswipe'
], function (Page) {
    'use strict';

    var SpeciesPage = Page.extend({
        id: 'species',

        template: app.templates.p_species,

        events: {
            'click #species-profile-fav-button': 'toggleSpeciesFavourite',
            'click #species-map': 'toggleMap',
            'click #species-map-button': 'toggleMap',
            'click #gallery-button': 'showGallery',
            'click #profile_pic': 'showGallery'
        },

        initialize: function () {
            _log('views.SpeciesPage: initialize', log.DEBUG);

            this.render();
            this.appendEventListeners();
        },

        render: function () {
            _log('views.SpeciesPage: render', log.DEBUG);

            this.$el.html(this.template());
            $('body').append($(this.el));
        },

        update: function (speciesID) {
            scrollTo(0, 0); //needs to go up if the profile has changed

            this.model = app.collections.species.find({id: speciesID});

            var $heading = $('#species_heading');
            $heading.text(this.model.attributes.taxon);

            //append the profile
            var $profile = this.$el.find('#species-profile-placeholder');
            var profileView = new SpeciesProfile({model: this.model});
            $profile.html(profileView.render().el);
            $profile.trigger('create');

            //turn on/off fav button
            var $favButton = $("#species-profile-fav-button");
            if (app.models.user.isFavourite(speciesID)) {
                $favButton.addClass("on");
            } else {
                $favButton.removeClass("on");
            }

            //add Gallery
            this.initGallery();

            //add Flight profile
            this.addFlightData();

            //add Map
            var $mapsHolder = $('#maps-holder');
            $.get("images/country_coastline.svg", function(data) {
                $mapsHolder.html(new XMLSerializer().serializeToString(data.documentElement));
            });
            $.get(this.model.attributes.map, function(data) {
                $mapsHolder.append(new XMLSerializer().serializeToString(data.documentElement));
            });
        },

        appendEventListeners: function () {
            this.appendBackButtonListeners();
            $(window).on("resize", $.proxy(function () {
                this.updateFlightData();
            }, this));
        },

        /**
         * Toggles the current species as favourite by saving it into the
         * storage and changing the buttons appearance.
         */
        toggleSpeciesFavourite: function (e) {
            var $favButton = $(e.target);
            $favButton.toggleClass("on");
            var speciesID = this.model.get('id');
            app.models.user.toggleFavouriteSpecies(speciesID);
        },

        /**
         * Adds fight histograms to the species profile.
         */
        addFlightData: function () {
            //gracefully fallback and not break anything else if not found.
            if (app.data.flight == null || app.data.flight == 'undefined') {
                _log('species: app.data.flight not found', log.ERROR);
                return;
            }
            var container = $('#species-flight');

            //if server data came earlier than the page was rendered
            if (container.length == 0) {
                return;
            }

            var speciesID = this.model.get('id');
            var flight_data = app.data.flight[speciesID];

            if (flight_data == null) {
                _log('species: no flight data was found for: ' + speciesID, log.ERROR);
                return;
            }

            var data = [];

            var WEEKS_IN_YEAR = 52;
            for (var i = 0; i < WEEKS_IN_YEAR; i++) {
                data.push({
                    'x': i,
                    'y': flight_data[i] / 10 || 0
                });
            }
            this.renderFlightData(data);
        },

        updateFlightData: function () {
            var page = Backbone.history.getFragment();
            if (page.indexOf('species') >= 0) {
                _log('views.SpeciesPage: updating flight data', log.DEBUG);
                this.addFlightData();
            }
        },

        /**
         * Creates SVG using D3 lib and attaches it to the Species profile.
         *
         * Code from: http://www.sitepoint.com/creating-simple-line-bar-charts-using-d3-js/
         */
        renderFlightData: function (barData) {
            var container = $('#species-flight');

            var WIDTH = container.width(),
                HEIGHT = container.height(),
                MARGINS = {
                    top: 0,
                    right: WIDTH * 0.05,
                    bottom: HEIGHT * 0.2,
                    left: 0
                };

            var xScale = d3.scale.ordinal().rangeRoundBands([MARGINS.left, WIDTH - MARGINS.right], 0.1)
                .domain(barData.map(
                    function (d) {
                        return d.x;
                    }
                ));

            var yScale = d3.scale.linear().range([HEIGHT - MARGINS.top, MARGINS.bottom])
                .domain([0, d3.max(barData,
                    function (d) {
                        return d.y;
                    }
                )]);

            var xAxis = d3.svg.axis()
                .scale(xScale)
                .tickFormat(function (weekNum) {
                    var MONTH_SPACE = 8; //display tick every so weeks

                    var width = $('#species-flight').width();
                    if (width > 400) {
                        MONTH_SPACE = 4;
                    }

                    //display only monthly tick labels
                    if (weekNum % MONTH_SPACE > 0 || weekNum == 0) {
                        return;
                    }
                    var monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

                    var d = ( (weekNum) * 7); // 1st of January + 7 days for each week
                    var monthNum = new Date(2014, 0, d).getMonth();
                    var month = monthNames[monthNum];

                    return month;
                });

            var yAxis = d3.svg.axis()
                .scale(yScale)
                .tickValues([0, 100])
                .orient("left");


            // Add an SVG element with the desired dimensions and margin.
            var graph = d3.select("#species-flight").html('').append("svg:svg")
                .attr("width", WIDTH + MARGINS.right + MARGINS.left)
                .attr("height", HEIGHT + MARGINS.top + MARGINS.bottom)
                .append("svg:g");
            // .attr("transform", "translate(" + MARGINS.bottom + "," + MARGINS.top + ")");

            graph.append('svg:g')
                .attr('class', 'x axis')
                .attr('transform', 'translate(0,' + (HEIGHT - MARGINS.bottom) + ')')
                .call(xAxis);

            var BAR_WIDTH = xScale.rangeBand();
            if (WIDTH < 400) {
                BAR_WIDTH = 3; //small bar width for small screens
            }
            var rectFill = '#C2B855';
            var rectFillOut = '#828829';
            graph.selectAll('rect')
                .data(barData)
                .enter()
                .append('rect')
                .attr('x', function (d) {
                    return xScale(d.x);
                }
            )
                .attr('y', function (d) {
                    return yScale(d.y);
                }
            )
                .attr('width', BAR_WIDTH)
                .attr('height', function (d) {
                    //trim negative ones
                    var height = ((HEIGHT - MARGINS.bottom) - yScale(d.y));
                    return height > 0 ? height : 0;
                })
                .attr('fill', rectFill)
                .on('mouseover', function (d) {
                    d3.select(this)
                        .attr('fill', rectFillOut);
                })
                .on('mouseout', function (d) {
                    d3.select(this)
                        .attr('fill', rectFill);
                });

            //attach graph bar count label
            graph.append("text")
                .attr('id', 'bar-count')
                .attr('font-size', 10)
                .attr("y", -20) //hide in the beginning
                .attr("x", -20)
                .attr("dy", "1em")
                .style("text-anchor", "middle")
                .text("");

            //attach bar click listeners
            $('rect').on('click', function () {
                var count = this.height.baseVal.value;
                var x = this.x.baseVal.value;

                var counter = $('#bar-count');
                counter.attr('y', (HEIGHT - count - MARGINS.bottom) - 15); // -15 to lift it slightly up
                counter.attr('x', x + 5); //needs slight incrementation to stay in middle of bar
                counter.text(count.toFixed(0));
            });
        },

        /**
         * Shows/hides the distribution map.
         */
        toggleMap: function () {
            $('#species-map').toggle('slow');
        },

        /**
         * Launches the species gallery viewing.
         */
        showGallery: function () {
            if ($('.gallery')) {
                this.gallery.show(0);
            } else {
                app.message('I have no pictures to show :(');
            }
        },

        /**
         * Initializes the species gallery.
         */
        initGallery: function () {
            var images = $('#species_gallery a');

            if (images.length > 0) {
                this.gallery = images.photoSwipe({
                    jQueryMobile: true,
                    preventSlideshow: true,
                    allowUserZoom: true,
                    loop: true,
                    captionAndToolbarAutoHideDelay: 0,
                    enableMouseWheel: true,
                    enableKeyboard: true
                });
            }
        }
    });

    var SpeciesProfile = Backbone.View.extend({
        template: app.templates.species_profile,

        /**
         * Renders the species profile.
         *
         * @returns {SpeciesProfile}
         */
        render: function () {
            var species = this.compileConfusionSpecies(this.model.get('confusion_species'));
            this.model.set('confusion_species', species);
            this.$el.html(this.template(this.model.attributes));
            return this;
        },

        compileConfusionSpecies: function (species) {
            var common_name = '',
                specie = null,
                ids = [],
                replacements = {};

            //if only one species then it comes as a numeber and not a string
            if (typeof species === 'number') {
                species = '' + species;
            }
            ids = species.match(/[0-9]+/g);

            if (!ids || species.search('<a') >= 0) {
                return species;
            }

            //generate id replacements
            for (var i = 0; i < ids.length; i++) {
                specie = app.collections.species.get(parseInt(ids[i]));
                common_name = specie && specie.get('common_name') || '';

                if (common_name) {
                    replacements[ids[i]] = '<a href="#species/' + ids[i] + '">' + common_name + '</a>'
                }
            }

            for (var id in replacements) {
                species = species.replace(id, replacements[id]);
            }

            return species;
        }
    });

    return SpeciesPage;
});

