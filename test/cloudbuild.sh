#!/bin/sh

set -u
export D=$1
R=$2
export X=$(node --version)

cd $R
(
    echo "Build $(cat _logs/info.txt | cut -d ' ' -f 1) on $D Node.js $X at $(date '+%Y-%m-%d %H:%M')"
    npm install
    npm run testprogs:run >/dev/null 2>&1
    npm run build
    npm run cloudtest
    echo "Test exit code: $?"
) 2>&1 | tee -a "$R/_logs/$D-$X.log"
npm run clean
