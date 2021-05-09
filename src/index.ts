import * as express from 'express'
import * as YAML from 'yaml'
import { request } from './request'
import * as fs from 'fs'

function JSON_stringify(s: any, emit_unicode = false)
{
    // https://dencode.com/string/unicode-escape
    var json = JSON.stringify(s);
    return emit_unicode ? json : json.replace(/[\u007f-\uffff]/g,
        function(c) {
            return '\\u'+('0000'+c.charCodeAt(0).toString(16)).slice(-4);
        }
    );
}

// Create a new express application instance
const app = express();

// support application/json type post data
app.use(express.json());
//support application/x-www-form-urlencoded post data
app.use(express.urlencoded({ extended: false }));

app.all("*", function (req, res, next) {
    request.get(req.url)
        .then((response: { type: string; text: any; body: any }) => {
            res.type(response.type);

            // http://thexem.de/map/allNames?origin=tvdb&seasonNumbers=true
            if (response.type !== "application/json" || !req.url.startsWith("/v1/scenemapping")) {
                console.log(`Skipping non mapping request: ${req.url}`);
                res.send(response.text || response.body)
                return;
            }
            console.log("Overriding request")

            let body = response.body;
            let rawdata = fs.readFileSync('config/sonarr-mapping.yml', 'utf-8');
            let mapping = YAML.parse(rawdata);

            let excludeEntries = mapping.exclude || [];
            console.log(`Exclude entries: ${excludeEntries.length}`);
            
            var filtered = body.filter(function(value: any, index: any, arr: any){ 
                return excludeEntries.indexOf(value.tvdbId) < 0;
            });

            let includeEntries = mapping.include || [];
            console.log(`Include entries: ${includeEntries.length}`)
            filtered = filtered.concat(includeEntries);

            res.send(JSON_stringify(filtered))
        })
        .catch((reason: any) => {
            res.send(reason)
            next();
        })
});

// The port the express app will listen on
const port = process.env.PORT || 3000;

// Serve the application at the given port
app.listen(port, () => {
    // Success callback
    console.log(`Listening at http://localhost:${port}/`);
});
