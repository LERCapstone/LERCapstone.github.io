rm index.zip
cd lambda
zip a -r ../index.zip *
cd ..
aws lambda update-function-code --function-name aph_o_m_trivia --zip-file fileb://index.zip
