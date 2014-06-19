#!/bin/sh

echo `date`
cd /home/shared/frontend
git checkout staging
git reset --hard
git pull origin staging