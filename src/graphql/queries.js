export const listExpenses = `
  query ListExpenses {
    listExpenses {
      items {
        id
        description
        amount
        category
        date
        createdAt
      }
    }
  }
`;

export const getExpensesByCategory = `
  query GetExpensesByCategory($category: String!) {
    getExpensesByCategory(category: $category) {
      items {
        id
        description
        amount
        category
        date
        createdAt
      }
    }
  }
`;