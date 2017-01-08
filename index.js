var blessed = require('blessed');
var contrib = require('blessed-contrib');
var program = require('commander');
var {List} = require('immutable');
var fs = require('fs');
var request = require('request-promise');

program
  .version('0.0.1')
  .parse(process.argv);

var screen = blessed.screen();
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
    
    request('http://www.bom.gov.au/fwo/IDV60901/IDV60901.95936.json')
        .then(request => {
            loading.stop();
            var data = JSON.parse(request);
            var getData = key => List(data.observations.data).take(100).reverse().map(ii => ii[key]);
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

            var stats = grid
                .set(0, 0, 2, 1, contrib.table, {
                    label: 'Current',
                    keys: true,
                    columnSpacing: 3,
                    columnWidth: [20, 12]
                })
                .setData({
                    headers: ['Key', 'Value'],
                    data: Object.keys(current)
                        .map(ii => {
                            return [ii, current[ii] || '']
                        })
                        // [
                        // ['Air Temp', current.air_temp],
                        // ['Appartent Temp', current.apparent_t],
                        // ['cloud', current.cloud],
                        // ['cloud_base_m', current.cloud_base_m || ''],
                        // ['cloud_oktas', current.cloud_oktas || ''],
                        // ['cloud_type', current.cloud_type || ''],
                        // ['cloud_type_id', current.cloud_type_id || ''],
                        // ['dewpt', current.dewpt || ''],
                        // ['gust_kmh', current.gust_kmh || ''],
                        // ['local_date_time', current.local_date_time || ''],
                        // ['local_date_time_full', current.local_date_time_full || ''],
                        // ['press', current.press || ''],
                        // ['press_tend', current.press_tend || ''],
                        // ['rain_trace', current.rain_trace || ''],
                        // ['rel_hum', current.rel_hum || ''],
                        // ['sea_state', current.sea_state || ''],
                        // ['swell_dir_worded', current.swell_dir_worded || ''],
                        // ['swell_height', current.swell_height || ''],
                        // ['swell_period', current.swell_period || ''],
                        // ['vis_km', current.vis_km || ''],
                        // ['weather', current.weather || ''],
                        // ['wind_dir', current.wind_dir || ''],
                        // ['wind_spd_kmh', current.wind_spd_kmh || '']
                    // ]
                })

            var temperature = grid
                .set(0, 1, 2, 5, contrib.line, lineStyle({ 
                    style: { 
                        line: "yellow"
                    },
                    label: `Temperature: ${current.air_temp}, Feels like: ${current.apparent_t}`,
                    minY: getData('air_temp').min()
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
                    minY: getData('wind_spd_kmh').min()
                }))
                .setData(setLineData([{key: 'wind_spd_kmh'}]));

            var humidity = grid
                .set(2, 2, 2, 2, contrib.line, lineStyle({ 
                    style: { 
                        line: "magenta"
                    },
                    label: `Humidity: ${current.rel_hum}%`,
                    numYLabels: 100,
                    minY: 0
                }))
                .setData(setLineData([{key: 'rel_hum'}]));

            var press = grid
                .set(2, 4, 2, 2, contrib.line, lineStyle({ 
                    style: { 
                        line: "magenta"
                    },
                    label: `Pressure: ${current.press}${current.press_tend}`,
                    minY: 950
                }))
                .setData(setLineData([{key: 'press'}]));

            screen.render();

        })
}

requestData();



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

