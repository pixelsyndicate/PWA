// Copyright 2016 Google Inc.
// 
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
// 
//      http://www.apache.org/licenses/LICENSE-2.0
// 
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
/*
 * Run everything Here First
 */
(function () {
    'use strict';
    var app = {
        isLoading: true
        , visibleCards: {}
        , selectedCities: []
        , spinner: document.querySelector('.loader')
        , cardTemplate: document.querySelector('.cardTemplate')
        , container: document.querySelector('.main')
        , addDialog: document.querySelector('.dialog-container')
        , daysOfWeek: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    };
    /*****************************************************************************
     *
     * Event listeners for UI elements
     *
     ****************************************************************************/
    document.getElementById('butRefresh').addEventListener('click', function () {
        // Refresh all of the forecasts
        app.updateForecasts();
    });
    document.getElementById('butAdd').addEventListener('click', function () {
        // Open/show the add new city dialog
        app.toggleAddDialog(true);
    });
    document.getElementById('butAddCity').addEventListener('click', function () {
        // Add the newly selected city
        var select = document.getElementById('selectCityToAdd');
        var selected = select.options[select.selectedIndex];
        var key = selected.value;
        var label = selected.textContent;
        // TODO init the app.selectedCities array here
         
        if (!app.selectedCities) {   
            app.selectedCities = [];  
        }
        app.getForecast(key, label);
        // TODO push the selected city to the array and save here
        app.selectedCities.push({
            key: key
            , label: label
        });  
        app.saveSelectedCities();
        app.toggleAddDialog(false);
    });
    document.getElementById('butAddCancel').addEventListener('click', function () {
        // Close the add new city dialog
        app.toggleAddDialog(false);
    });
    /*****************************************************************************
     *
     * Methods to update/refresh the UI
     *
     ****************************************************************************/
    // Toggles the visibility of the add new city dialog.
    app.toggleAddDialog = function (visible) {
        if (visible) {
            app.addDialog.classList.add('dialog-container--visible');
        }
        else {
            app.addDialog.classList.remove('dialog-container--visible');
        }
    };
    // Updates a weather card with the latest weather forecast. If the card
    // doesn't already exist, it's cloned from the template.
    app.updateForecastCard = function (data) {
        var dataLastUpdated = new Date(data.created);
        var sunrise = data.channel.astronomy.sunrise;
        var sunset = data.channel.astronomy.sunset;
        var current = data.channel.item.condition;
        var humidity = data.channel.atmosphere.humidity;
        var wind = data.channel.wind;
        var card = app.visibleCards[data.key];
        if (!card) {
            // make a copy of the cardtemplate, clean it up, unhide it and display it
            card = app.cardTemplate.cloneNode(true);
            card.classList.remove('cardTemplate');
            card.querySelector('.location').textContent = data.label;
            card.removeAttribute('hidden');
            // put the new card into the .main
            app.container.appendChild(card);
            app.visibleCards[data.key] = card;
        }
        // Verifies the data provide is newer than what's already visible
        // on the card, if it's not bail, if it is, continue and update the
        // time saved in the card
        var cardLastUpdatedElem = card.querySelector('.card-last-updated');
        var cardLastUpdated = cardLastUpdatedElem.textContent;
        if (cardLastUpdated) {
            cardLastUpdated = new Date(cardLastUpdated);
            // Bail if the card has more recent data then the data
            if (dataLastUpdated.getTime() < cardLastUpdated.getTime()) {
                return;
            }
        }
        // bind the data to the elements on the card
        cardLastUpdatedElem.textContent = data.created;
        card.querySelector('.description').textContent = current.text;
        card.querySelector('.date').textContent = current.date;
        card.querySelector('.current .icon').classList.add(app.getIconClass(current.code));
        card.querySelector('.current .temperature .value').textContent = Math.round(current.temp);
        card.querySelector('.current .sunrise').textContent = sunrise;
        card.querySelector('.current .sunset').textContent = sunset;
        card.querySelector('.current .humidity').textContent = Math.round(humidity) + '%';
        card.querySelector('.current .wind .value').textContent = Math.round(wind.speed);
        card.querySelector('.current .wind .direction').textContent = wind.direction;
        var nextDays = card.querySelectorAll('.future .oneday');
        var today = new Date();
        today = today.getDay();
        for (var i = 0; i < 7; i++) {
            var nextDay = nextDays[i];
            var daily = data.channel.item.forecast[i];
            if (daily && nextDay) {
                nextDay.querySelector('.date').textContent = app.daysOfWeek[(i + today) % 7];
                nextDay.querySelector('.icon').classList.add(app.getIconClass(daily.code));
                nextDay.querySelector('.temp-high .value').textContent = Math.round(daily.high);
                nextDay.querySelector('.temp-low .value').textContent = Math.round(daily.low);
            }
        }
        if (app.isLoading) {
            app.spinner.setAttribute('hidden', true);
            app.container.removeAttribute('hidden');
            app.isLoading = false;
        }
    };
    /*****************************************************************************
     *
     * Methods for dealing with the model
     *
     ****************************************************************************/
    /*
     * Gets a forecast for a specific city and updates the card with the data.
     * getForecast() first checks if the weather data is in the cache. If so,
     * then it gets that data and populates the card with the cached data.
     * Then, getForecast() goes to the network for fresh data. If the network
     * request goes through, then the card gets updated a second time with the
     * freshest data.
     */
    app.getForecast = function (key, label) {
        var statement = 'select * from weather.forecast where woeid=' + key;
        var url = 'https://query.yahooapis.com/v1/public/yql?format=json&q=' + statement;
        // make two asynchronous requests for data. one from cache
        // TODO add cache logic here
        if ('caches' in window) {   
            /*
             * Check if the service worker has already cached this city's weather
             * data. If the service worker has the data, then display the cached
             * data while the app fetches the latest data.
             */
               
            caches.match(url).then(function (response) {    
                console.log('[app] cache has recent data request');
                if (response) {     
                    response.json().then(function updateFromCache(json) {  
                        var results = json.query.results;   
                        // sometimes results is null and cause js errors
                        if (results) {
                            console.log('[app] cache - results FOUND');
                            results.key = key;      
                            results.label = label;      
                            results.created = json.query.created;      
                            app.updateForecastCard(results); 
                        }    
                        else {
                            console.log('[app] cache - results NOT FOUND');
                        }
                    });    
                }   
            });  
        };
        // and one from the XHR
        // Fetch the latest data.
        var request = new XMLHttpRequest();
        request.onreadystatechange = function () {
            if (request.readyState === XMLHttpRequest.DONE) {
                if (request.status === 200) {
                    var response = JSON.parse(request.response);
                    var results = response.query.results;
                    if (results) {
                        console.log('[app] XHR - results FOUND');
                        results.key = key;
                        results.label = label;
                        results.created = response.query.created;
                        app.updateForecastCard(results);
                    }
                    else {
                        console.log('[app] XHR - results NOT FOUND');
                    }
                }
            }
            else {
                // Return the initial weather forecast since no data is available.
                app.updateForecastCard(initialWeatherForecast);
            }
        };
        request.open('GET', url);
        request.send();
    };
    // Iterate all of the cards and attempt to get the latest forecast data
    app.updateForecasts = function () {
        var keys = Object.keys(app.visibleCards);
        keys.forEach(function (key) {
            app.getForecast(key);
        });
    };
    // Save list of cities to localStorage.
    app.saveSelectedCities = function () {
        var selectedCities = JSON.stringify(app.selectedCities);
        
        console.log('[app] saving selectedCities to localStorage');
        // todo: replace localStorage with 
        localStorage.selectedCities = selectedCities;
        // keyValStore.set('selectedCities', selectedCities);
    };
    app.getIconClass = function (weatherCode) {
        // Weather codes: https://developer.yahoo.com/weather/documentation.html#codes
        weatherCode = parseInt(weatherCode);
        switch (weatherCode) {
        case 25: // cold
        case 32: // sunny
        case 33: // fair (night)
        case 34: // fair (day)
        case 36: // hot
        case 3200: // not available
            return 'clear-day';
        case 0: // tornado
        case 1: // tropical storm
        case 2: // hurricane
        case 6: // mixed rain and sleet
        case 8: // freezing drizzle
        case 9: // drizzle
        case 10: // freezing rain
        case 11: // showers
        case 12: // showers
        case 17: // hail
        case 35: // mixed rain and hail
        case 40: // scattered showers
            return 'rain';
        case 3: // severe thunderstorms
        case 4: // thunderstorms
        case 37: // isolated thunderstorms
        case 38: // scattered thunderstorms
        case 39: // scattered thunderstorms (not a typo)
        case 45: // thundershowers
        case 47: // isolated thundershowers
            return 'thunderstorms';
        case 5: // mixed rain and snow
        case 7: // mixed snow and sleet
        case 13: // snow flurries
        case 14: // light snow showers
        case 16: // snow
        case 18: // sleet
        case 41: // heavy snow
        case 42: // scattered snow showers
        case 43: // heavy snow
        case 46: // snow showers
            return 'snow';
        case 15: // blowing snow
        case 19: // dust
        case 20: // foggy
        case 21: // haze
        case 22: // smoky
            return 'fog';
        case 24: // windy
        case 23: // blustery
            return 'windy';
        case 26: // cloudy
        case 27: // mostly cloudy (night)
        case 28: // mostly cloudy (day)
        case 31: // clear (night)
            return 'cloudy';
        case 29: // partly cloudy (night)
        case 30: // partly cloudy (day)
        case 44: // partly cloudy
            return 'partly-cloudy-day';
        }
    };
    /*
     * Fake weather data that is presented when the user first uses the app,
     * or when the user has not saved any cities. See startup code for more
     * discussion.
     */
    var initialWeatherForecast = {
        key: '12779359', //'2459115',
        label: 'Holton, Mi', //'New York, NY',
        created: '1969-05-25T01:00:00Z'
        , channel: {
            units: {
                distance: "mi"
                , pressure: "in"
                , speed: "mph"
                , temperature: "F"
            }
            , title: "Yahoo! Weather - Holton, Mi, US"
            , link: "http://us.rd.yahoo.com/dailynews/rss/weather/Country__Country/*https://weather.yahoo.com/country/state/city-12779359/"
            , description: "Yahoo! Weather for Holton, Mi, US"
            , language: "en-us"
            , lastBuildDate: "Fri, 00 May 2017 09:53 AM CDT"
            , ttl: "60"
            , location: {
                city: "Holton"
                , country: "United States"
                , region: " MI"
            }
            , wind: {
                "chill": "63"
                , "direction": "335"
                , "speed": "11"
            }
            , atmosphere: {
                "humidity": "53"
                , "pressure": "996.0"
                , "rising": "0"
                , "visibility": "16.1"
            }
            , astronomy: {
                "sunrise": "6:44 am"
                , "sunset": "8:11 pm"
            }
            , item: {
                title: "Conditions for Holton, Mi, US at 09:00 AM CDT"
                , lat: "30.30637"
                , long: "-97.752762"
                , link: "http://us.rd.yahoo.com/dailynews/rss/weather/Country__Country/*https://weather.yahoo.com/country/state/city-12779359/"
                , pubDate: "Fri, 05 May 2017 09:00 AM CDT"
                , condition: {
                    code: "32"
                    , date: "Fri, 05 May 2017 09:00 AM CDT"
                    , temp: "63"
                    , text: "Sunny"
                }
                , forecast: [
                    {
                        "code": "32"
                        , "date": "05 May 2017"
                        , "day": "Fri"
                        , "high": "83"
                        , "low": "56"
                        , "text": "Sunny"
            }
                    , {
                        "code": "32"
                        , "date": "06 May 2017"
                        , "day": "Sat"
                        , "high": "87"
                        , "low": "58"
                        , "text": "Sunny"
            }
                    , {
                        "code": "34"
                        , "date": "07 May 2017"
                        , "day": "Sun"
                        , "high": "88"
                        , "low": "62"
                        , "text": "Mostly Sunny"
            }
                    , {
                        "code": "30"
                        , "date": "08 May 2017"
                        , "day": "Mon"
                        , "high": "85"
                        , "low": "63"
                        , "text": "Partly Cloudy"
            }
                    , {
                        "code": "28"
                        , "date": "09 May 2017"
                        , "day": "Tue"
                        , "high": "85"
                        , "low": "66"
                        , "text": "Mostly Cloudy"
            }
                    , {
                        "code": "28"
                        , "date": "10 May 2017"
                        , "day": "Wed"
                        , "high": "86"
                        , "low": "68"
                        , "text": "Mostly Cloudy"
            }
                    , {
                        "code": "47"
                        , "date": "11 May 2017"
                        , "day": "Thu"
                        , "high": "91"
                        , "low": "69"
                        , "text": "Scattered Thunderstorms"
            }
                    , {
                        "code": "47"
                        , "date": "12 May 2017"
                        , "day": "Fri"
                        , "high": "87"
                        , "low": "68"
                        , "text": "Scattered Thunderstorms"
            }
                    , {
                        "code": "12"
                        , "date": "13 May 2017"
                        , "day": "Sat"
                        , "high": "86"
                        , "low": "63"
                        , "text": "Rain"
            }
                    , {
                        "code": "34"
                        , "date": "14 May 2017"
                        , "day": "Sun"
                        , "high": "85"
                        , "low": "62"
                        , "text": "Mostly Sunny"
            }
              ]
            , }
        }
    };
    // Call to update the current card with either the fake data or
    // 
    app.updateForecastCard(initialWeatherForecast);
    // TODO add startup code here
    /************************************************************************
     *
     * Code required to start the app
     *
     * NOTE: To simplify this codelab, we've used localStorage.
     *   localStorage is a synchronous API and has serious performance
     *   implications. It should not be used in production applications!
     *   Instead, check out IDB (https://www.npmjs.com/package/idb) or
     *   SimpleDB (https://gist.github.com/inexorabletash/c8069c042b734519680c)
     ************************************************************************/
    console.log('[app] retrieving selectedCities from localStorage');
    app.selectedCities = localStorage.selectedCities;
    if (app.selectedCities) {
        console.log('[app] localStorage.selectedCities has values');
        app.selectedCities = JSON.parse(app.selectedCities);
        app.selectedCities.forEach(function (city) {
            console.log('[app] getForcast(' + city.key +', ' + city.label + ') called.');
            app.getForecast(city.key, city.label);
        });
    }
    else {
        console.log('[app] localStorage.selectedCities has no values');
        /* The user is using the app for the first time, or the user has not
         * saved any cities, so show the user some fake data. A real app in this
         * scenario could guess the user's location via IP lookup and then inject
         * that data into the page.
         */
        // assume the default city card
        app.updateForecastCard(initialWeatherForecast);
        // add the default to selected cities
        app.selectedCities = [{key: initialWeatherForecast.key, label: initialWeatherForecast.label}];
        app.saveSelectedCities();
    };
    // this places the service worker code into the browser's Application
    // (if('serviceWorker' in navigator)) is a check to see if the browser supports it
    // TODO add service worker code here
    if ('serviceWorker' in navigator) {  
        // when registered, an 'install' event triggers.
        navigator.serviceWorker.register('./service-worker.js').then(function () {
            console.log('Service Worker Registered');
        }); 
    }
})();