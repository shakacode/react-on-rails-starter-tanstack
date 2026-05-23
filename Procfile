web: bundle exec thrust bundle exec rails server -p ${PORT:-3000}
worker: bin/jobs
renderer: RAILS_ENV=${RAILS_ENV:-production} RENDERER_PORT=${RENDERER_PORT:-3800} node client/node-renderer.js
