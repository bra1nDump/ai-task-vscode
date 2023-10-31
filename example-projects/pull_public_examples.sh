#!/bin/bash

# Make sure we are in a directory that ends with example-projects
if [[ ! "$PWD" =~ example-projects$ ]]; then
  echo "Please run this script from the example-projects directory"
  exit 1
fi


# https://github.com/apollographql/apollo-server/issues/7502
echo "Pulling apollo-server-bigint-issue"
wget https://github.com/oxilor/apollo-server-bigint-issue/archive/main.tar.gz -O apollo-server-bigint-issue.tar.gz


echo "Extracting apollo-server-bigint-issue.tar.gz"
tar -xzf apollo-server-bigint-issue.tar.gz