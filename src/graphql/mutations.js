export const createExpense = `
  mutation CreateExpense($input: CreateExpenseInput!) {
    createExpense(input: $input) {
      id
      description
      amount
      category
      date
      createdAt
    }
  }
`;

export const updateExpense = `
  mutation UpdateExpense($id: ID!, $input: UpdateExpenseInput!) {
    updateExpense(id: $id, input: $input) {
      id
      description
      amount
      category
      date
      createdAt
    }
  }
`;

export const deleteExpense = `
  mutation DeleteExpense($id: ID!) {
    deleteExpense(id: $id) {
      id
    }
  }
`;