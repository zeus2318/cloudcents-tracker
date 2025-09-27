// Lambda function for saving expenses to DynamoDB
// File: saveExpenses.js

const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();

const TABLE_NAME = 'CloudCentsExpenses';

exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Content-Type': 'application/json'
    };

    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }

    try {
        const expenses = JSON.parse(event.body);
        
        // Delete all existing expenses first (simple approach for full sync)
        const scanResult = await dynamodb.scan({
            TableName: TABLE_NAME
        }).promise();

        // Delete existing items in batches
        if (scanResult.Items.length > 0) {
            const deleteRequests = scanResult.Items.map(item => ({
                DeleteRequest: {
                    Key: { id: item.id }
                }
            }));

            // Process in batches of 25 (DynamoDB limit)
            for (let i = 0; i < deleteRequests.length; i += 25) {
                const batch = deleteRequests.slice(i, i + 25);
                await dynamodb.batchWrite({
                    RequestItems: {
                        [TABLE_NAME]: batch
                    }
                }).promise();
            }
        }

        // Insert new expenses in batches
        if (expenses.length > 0) {
            const putRequests = expenses.map(expense => ({
                PutRequest: {
                    Item: {
                        id: expense.id.toString(),
                        description: expense.description,
                        amount: expense.amount,
                        category: expense.category,
                        date: expense.date,
                        createdAt: expense.createdAt,
                        updatedAt: new Date().toISOString()
                    }
                }
            }));

            // Process in batches of 25
            for (let i = 0; i < putRequests.length; i += 25) {
                const batch = putRequests.slice(i, i + 25);
                await dynamodb.batchWrite({
                    RequestItems: {
                        [TABLE_NAME]: batch
                    }
                }).promise();
            }
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                message: 'Expenses saved successfully',
                count: expenses.length
            })
        };

    } catch (error) {
        console.error('Error saving expenses:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: 'Failed to save expenses',
                details: error.message
            })
        };
    }
};

// ============================================
// DynamoDB Table Creation Script (AWS CLI)
// Run this command to create the table:
/*
aws dynamodb create-table \
    --table-name CloudCentsExpenses \
    --attribute-definitions \
        AttributeName=id,AttributeType=S \
    --key-schema \
        AttributeName=id,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST \
    --region us-east-1
*/