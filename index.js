'use strict';

const AWS = require('aws-sdk');
const S3 = new AWS.S3({
  signatureVersion: 'v4',
});
const Sharp = require('sharp');

const BUCKET = process.env.BUCKET;
const URL = process.env.URL;
const ALLOWED_DIMENSIONS = new Set();

if (process.env.ALLOWED_DIMENSIONS) {
  const dimensions = process.env.ALLOWED_DIMENSIONS.split(/\s*,\s*/);
  dimensions.forEach((dimension) => ALLOWED_DIMENSIONS.add(dimension));
}

exports.handler = function(event, context, callback) {
  const key = event.queryStringParameters.key;
  const match = key.match(/((\d+)x(\d+))\/(.*)/);
  const dimensions = match[1];
  const width = parseInt(match[2], 10);
  const height = parseInt(match[3], 10);
  const originalKey = match[4];
  const image_type = originalKey.split('.')[1];

  if(ALLOWED_DIMENSIONS.size > 0 && !ALLOWED_DIMENSIONS.has(dimensions)) {
     callback(null, {
      statusCode: '403',
      headers: {},
      body: '',
    });
    return;
  }
  if(image_type == 'png') {
    S3.getObject({Bucket: BUCKET, Key: originalKey}).promise()
      .then(data => Sharp(data.Body)
        .resize(width, height)
        .toFormat('png')
        .toBuffer()
      )
      .then(buffer => S3.putObject({
          Body: buffer,
          Bucket: BUCKET,
          ContentType: 'image/png',
          Key: key,
        }).promise()
      )
      .then(() => callback(null, {
          statusCode: '200',
          headers: {'location': `${URL}/${key}`},
          body: '',
        })
      )
      .catch(err => callback(err)) 
  }else{
      S3.getObject({Bucket: BUCKET, Key: originalKey}).promise()
      .then(data => Sharp(data.Body)
        .resize(width, height)
        .toFormat('jpeg')
        .toBuffer()
      )
      .then(buffer => S3.putObject({
          Body: buffer,
          Bucket: BUCKET,
          ContentType: 'image/jpeg',
          Key: key,
        }).promise()
      )
      .then(() => callback(null, {
          statusCode: '200',
          headers: {'location': `${URL}/${key}`},
          body: '',
        })
      )
      .catch(err => callback(err)) 
  }
}
