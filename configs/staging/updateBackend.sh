#!/bin/bash

cd /home/nodejs/backend
git checkout staging
git reset --hard
git pull origin staging