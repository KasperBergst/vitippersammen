import swaggerAutogen from 'swagger-autogen';

const doc = {
  info: {
    title: 'Vitippersammen API',
    description: 'See all endpoints of the vitippersammen api server.',
  },
  host: 'localhost:8080',
  schemes: ['http'],
};

const outputFile = './swagger-output.json';
const endpointsFiles = ["../app.js"];

/* NOTE: if you use the express Router, you must pass in the 
   'endpointsFiles' only the root file where the route starts,
   such as index.js, app.js, routes.js, ... */

swaggerAutogen(outputFile, endpointsFiles, doc);