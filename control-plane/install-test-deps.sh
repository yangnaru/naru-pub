#!/bin/bash

echo "Installing Jest and testing dependencies..."

npm install --save-dev \
  jest \
  @jest/globals \
  @testing-library/jest-dom \
  @testing-library/react \
  @testing-library/user-event \
  jest-environment-jsdom \
  ts-jest \
  identity-obj-proxy

echo "Testing dependencies installed successfully!"
echo ""
echo "To run tests:"
echo "npm test"
echo ""
echo "To run tests with coverage:"
echo "npm test -- --coverage"
echo ""
echo "To run tests in watch mode:"
echo "npm test -- --watch"