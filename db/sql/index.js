'use strict';

var QueryFile = require('pg-promise').QueryFile;
var path = require('path');

// Helper for linking to external query files;
function sql(file) {

    var fullPath = path.join(__dirname, file); // generating full path;

    var options = {

        // minifying the SQL is always advised;
        // see also option 'compress' in the API;
        minify: true,

        // Showing how to use static pre-formatting parameters -
        // we have variable 'schema' in each SQL (as an example);
        params: {
            schema: 'public' // replace ${schema~} with "public"
        }
    };

    return new QueryFile(fullPath, options);

    // See QueryFile API:
    // http://vitaly-t.github.io/pg-promise/QueryFile.html
}


module.exports = {
    tweets: {
        addhash: sql('tweets/addhash.sql'),
        count: sql('tweets/count.sql'),
        link: sql('tweets/link.sql'),
        selectall: sql('tweets/selectall.sql'),
        selectids: sql('tweets/selectids.sql'),
        selectone: sql('tweets/selectone.sql')
    }
};

//////////////////////////////////////////////////////////////////////////
// Consider an alternative - enumerating all SQL files automatically ;)
// API: http://vitaly-t.github.io/pg-promise/utils.html#.enumSql

/*
// generating a recursive SQL tree for dynamic use of camelized names:
var enumSql = require('pg-promise').utils.enumSql;

module.exports = enumSql(__dirname, {recursive: true}, file=> {
    // NOTE: 'file' contains the full path to the SQL file, because we use __dirname for enumeration.
    return new QueryFile(file, {
        minify: true,
        params: {
            schema: 'public' // replace ${schema~} with "public"
        }
    });
});
*/
