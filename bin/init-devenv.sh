#!/bin/bash

set -eu

echo "**********************************************"
echo " Now creating local developer and environment "
echo " You need sshd server running on your localhost "
echo "**********************************************"

# TODO connect to localhost and emulate sftp pull <-> push
# This script create user and group
# ssh-keygen
# create

SSH_KNOWN_HOSTS_FILE=.devconf/test_know_hosts
SSH_CONFIG_FILE=.devconf/test_config
SSH_KEY_FILE=.devconf/test_id_ecdsa
SSH_PUBKEY_FILE=${SSH_KEY_FILE}.pub

SSH_DEVUSER=publivecam-dev
SSH_DEVUSER_HOMEDIR=/home/${SSH_DEVUSER}/.ssh/
SSH_DEVUSER_AUTHORIZED_FILE=${SSH_DEVUSER_HOMEDIR}/authorized_keys

SSHD_EXTENDED_CONFIG=.devconf/test_sshd_config

sudo adduser ${SSH_DEVUSER} || echo "Already created ${SSH_DEVUSER}"
sudo mkdir -p /home/${SSH_DEVUSER}/share/PublicLiveCamera
sudo chown root:root /home/${SSH_DEVUSER}/ /home/${SSH_DEVUSER}/share/
ssh-keygen -t ecdsa -f ${SSH_KEY_FILE}
sudo mkdir -p ${SSH_DEVUSER_HOMEDIR}
sudo rm -f ${SSH_DEVUSER_AUTHORIZED_FILE}
cat ${SSH_PUBKEY_FILE} | sudo tee -a ${SSH_DEVUSER_AUTHORIZED_FILE}

sudo chown -R ${SSH_DEVUSER}:${SSH_DEVUSER} ${SSH_DEVUSER_HOMEDIR}

echo -n > "${SSH_KNOWN_HOSTS_FILE}"
ssh-keyscan -H localhost >>"${SSH_KNOWN_HOSTS_FILE}"

echo -n > ${SSH_CONFIG_FILE}
echo "IdentitiesOnly=true" >>  ${SSH_CONFIG_FILE}
echo "UserKnownHostsFile=${SSH_KNOWN_HOSTS_FILE}" >> ${SSH_CONFIG_FILE}

sudo cp ${SSHD_EXTENDED_CONFIG} /etc/ssh/sshd_config.d/public-live-camera.conf

sudo sshd -t && sudo systemctl restart sshd

echo "**********************************************"
echo " Developer created on your local machine"
echo "**********************************************"
