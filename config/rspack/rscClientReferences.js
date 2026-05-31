const path = require('path');

const rscClientReferences = [
  {
    directory: path.resolve(__dirname, '../../app/javascript/src/HelloServer/components'),
    recursive: true,
    include: /\.(js|ts|jsx|tsx)$/,
  },
  {
    directory: path.resolve(__dirname, '../../app/javascript/src/RscShowcase/components'),
    recursive: true,
    include: /\.(js|ts|jsx|tsx)$/,
  },
];

module.exports = rscClientReferences;
