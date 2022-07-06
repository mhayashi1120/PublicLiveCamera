#!/bin/bash

# TODO
# LIVECAMERA_GOOGLE_API_TOKEN: \${{ secrets.GOOGLE_API_TOKEN }}
if ! source .devconf/test_devenv.sh ; then
  echo "Failed initialize environment" >&2
  exit 1
fi

export GITHUB_WORKSPACE
export GITHUB_WORKFLOW="Local Test"

export PUBLISH_SERVER_HOST=localhost
export PUBLISH_SERVER_PORT=22
export PUBLISH_SERVER_USER=publivecam-dev

if [ ! -f .devconf/test_id_ecdsa ] ; then
  echo "You need initialize the environment" >&2
  exit 1
fi

make clean-working

export SSH_KNOWN_HOSTS_FILE=.devconf/test_know_hosts
export SSH_CONFIG_FILE=.devconf/test_config
export SSH_KEY_FILE=.devconf/test_id_ecdsa

"$@"
