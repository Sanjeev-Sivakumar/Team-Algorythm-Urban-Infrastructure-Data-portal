const { Parser } = require('json2csv');

exports.generateCSV = (data) => {
    const parser = new Parser();
    return parser.parse(data);
};