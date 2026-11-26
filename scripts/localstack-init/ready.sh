#!/bin/bash
awslocal s3 mb s3://service-hub --region us-east-1
awslocal s3api put-bucket-acl --bucket service-hub --acl public-read
echo "Bucket 'service-hub' created and set to public-read."
