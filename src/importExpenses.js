// importExpenses.js
import { GraphQLClient, gql } from "graphql-request";
import expensesSampleData from "./recentExpenses.js";
import awsconfig from "./aws-exports.js";

const client = new GraphQLClient(awsconfig.aws_appsync_graphqlEndpoint, {
  headers: {
    "x-api-key": awsconfig.aws_appsync_apiKey
  }
});

const createExpense = gql`
  mutation CreateExpense(
    $description: String!
    $amount: Float!
    $category: String!
    $date: AWSDate!
    $createdAt: AWSDateTime
  ) {
    createExpense(input: {
      description: $description,
      amount: $amount,
      category: $category,
      date: $date,
      createdAt: $createdAt
    }) {
      id
      description
      amount
      category
      date
      createdAt
    }
  }
`;

async function importExpenses() {
  for (const expense of expensesSampleData.expenses) {
    try {
      const response = await client.request(createExpense, {
        description: expense.description,
        amount: expense.amount,
        category: expense.category,
        date: expense.date,
        createdAt: expense.createdAt
      });
      console.log("✅ Inserted:", response.createExpense);
    } catch (err) {
      console.error("❌ Error inserting expense:", err.response?.errors ?? err);
    }
  }
}

importExpenses();
