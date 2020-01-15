#!/usr/bin/env node
var blessed = require('blessed');
var contrib = require('blessed-contrib');
var program = require('commander');
var {List} = require('immutable');
var fs = require('fs');
var request = require('request-promise');
var DateTime = require('luxon').DateTime;

program
  .version('0.0.1')
  .parse(process.argv);

var screen = blessed.screen({
debug: true
});
var loading = blessed.loading({
    top: 'center',
    left: 'center',
    width: '100%',
    height: '100%',
    content: 'Loading'
});


screen.append(loading);
screen.render();



// console.log(Object.keys(data.observations.data[0]))
function requestData() {
    loading.load('Loading');
    screen.render();
    
    request('http://reg.bom.gov.au/fwo/IDV60901/IDV60901.95936.json')
        .then(request => {
            loading.stop();
            var data = JSON.parse(request);
            var getData = key => List(data.observations.data).take(100).reverse().map(ii => +ii[key]);
            var time = getData('local_date_time').toArray();

            function setLineData(keys) {
                return keys.map(ii => {
                    return {
                        title: ii.key,
                        x: time,
                        y: getData(ii.key).toArray(),
                        style: ii.style
                    }
                })
            }

            function lineStyle(object) {
                return Object.assign({}, {
                    xLabelPadding: 3,
                    numYLabels: 40,
                    xPadding: 5,
                }, object);
            }

            var defaultLineStyle = {
                xLabelPadding: 3,
                numYLabels: 40,
                xPadding: 5,
            }

            var current = data.observations.data[0];
            screen.debug(DateTime.fromFormat(current.local_date_time_full.toString(), 'yyyyMMddHHmm'))
            screen.debug(current.local_date_time_full)

            var stats = grid
                .set(0, 0, 2, 1, contrib.table, {
                    label:`${current.name}`,
                    keys: false,
                    interactive: false,
                    columnSpacing: 3,
                    columnWidth: [16, 12]
                })
                .setData({
                    headers: ['', ''],
                    //data: Object.keys(current).map(ii => [ii, current[ii] || ''])
                    data: [
                         ['Issued at', DateTime.fromFormat(current.local_date_time_full.toString(), 'yyyyMMddHHmms').toFormat('MMM d HH:mm')],
                         ['Temp', current.air_temp],
                         ['Feels Like', current.apparent_t],
                         ['Air Pressure', current.press || ''],
                         ['Pressure Change', current.press_tend || ''],
                         ['Wind Speed', current.wind_spd_kmh || ''],
                         ['Wind Gust', current.gust_kmh || ''],
                         ['Wind Direction', current.wind_dir || ''],
                         ['Humidity', `${current.rel_hum}%`],
                         ['Rain since 9am', `${current.rain_trace}mm` || ''],
                         ['Dew Point', current.dewpt || ''],
                         //['cloud', current.cloud],
                         //['cloud_base_m', current.cloud_base_m || ''],
                         //['cloud_oktas', current.cloud_oktas || ''],
                         //['cloud_type', current.cloud_type || ''],
                         //['cloud_type_id', current.cloud_type_id || ''],
                         //['local_date_time', current.local_date_time || ''],
                         //['sea_state', current.sea_state || ''],
                         //['swell_dir_worded', current.swell_dir_worded || ''],
                         //['swell_height', current.swell_height || ''],
                         //['swell_period', current.swell_period || ''],
                         //['vis_km', current.vis_km || ''],
                         //['weather', current.weather || ''],
                     ]
                })

            var temperature = grid
                .set(0, 1, 2, 5, contrib.line, lineStyle({ 
                    maxY: Math.round(Math.max(getData('air_temp').max(), getData('apparent_t').max())),
                    style: { 
                        line: "yellow"
                    },
                    label: `Temperature: ${current.air_temp}, Feels like: ${current.apparent_t}`,
                    wholeNumbersOnly: true,
                    minY: Math.round(Math.min(getData('air_temp').min(), getData('apparent_t').min()))
                }))
                .setData(setLineData([
                    {
                        key: 'apparent_t',
                    },
                    {
                        key: 'air_temp',
                        style: {
                            line: 'red'
                        }
                    }
                ]));

            var wind = grid
                .set(2, 0, 2, 2, contrib.line, lineStyle({ 
                    style: { 
                        line: "blue"
                    },
                    label: `Wind speed: ${current.wind_spd_kmh}km/h, direction: ${current.wind_dir}`,
                    wholeNumbersOnly: true,
                    minY: getData('wind_spd_kmh').min(),
                    maxY: getData('wind_spd_kmh').max()
                }))
                .setData(setLineData([{key: 'wind_spd_kmh'}]));

            var humidity = grid
                .set(2, 2, 2, 2, contrib.line, lineStyle({ 
                    style: { 
                        line: "magenta"
                    },
                    label: `Humidity: ${current.rel_hum}%`,
                    wholeNumbersOnly: true,
                    minY: getData('rel_hum').min(),
                    maxY: 102
                }))
                .setData(setLineData([{key: 'rel_hum'}]));

            var press = grid
                .set(2, 4, 2, 2, contrib.line, lineStyle({ 
                    style: { 
                        line: "magenta"
                    },
                    label: `Rain since am: ${current.rain_trace}mm`,
                    wholeNumbersOnly: true,
                    maxY: getData('rain_trace').max(),
                    minY: getData('rain_trace').min(),
                }))
                .setData(setLineData([{key: 'rain_trace'}]));


            screen.render();

        })
        .catch(e => {
            console.log(e.message);
            loading.stop();
            screen.render();
        })
}




var grid = new contrib.grid({
    rows: 4, 
    cols: 6, 
    screen: screen
});

screen.key(['escape', 'q', 'C-c'], function(ch, key) {
    return process.exit(0);
});

screen.key(['return', 'enter'], function(ch, key) {
    requestData();
});
requestData();

