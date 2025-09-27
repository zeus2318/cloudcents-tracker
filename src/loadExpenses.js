// ============================================
// Lambda function for loading expenses from DynamoDB
// File: loadExpenses.js

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
        const result = await dynamodb.scan({
            TableName: TABLE_NAME
        }).promise();

        // Convert id back to number and sort by createdAt (newest first)
        const expenses = result.Items.map(item => ({
            ...item,
            id: parseInt(item.id),
            amount: parseFloat(item.amount)
        })).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                expenses,
                count: expenses.length
            })
        };

    } catch (error) {
        console.error('Error loading expenses:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: 'Failed to load expenses',
                details: error.message
            })
        };
    }
};
