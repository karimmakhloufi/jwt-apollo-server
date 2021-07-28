const { ApolloServer, gql, ApolloError } = require("apollo-server");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const jwtKey = "my_secret_key_that_must_be_very_long";

// A schema is a collection of type definitions (hence "typeDefs")
// that together define the "shape" of queries that are executed against
// your data.
const typeDefs = gql`
  type Book {
    title: String
    author: String
  }
  type Query {
    books: [Book]
    login(email: String, password: String): String
  }
`;

const books = [
  {
    title: "The Awakening",
    author: "Kate Chopin",
  },
  {
    title: "City of Glass",
    author: "Paul Auster",
  },
];

const usersDB = [
  {
    email: "admin@gmail.com",
    hash: bcrypt.hashSync("p4ssw0rd", 10),
  },
];

// Resolvers define the technique for fetching the types defined in the
// schema. This resolver retrieves books from the "books" array above.
const resolvers = {
  Query: {
    books: (parents, args, context, info) => {
      if (context.authenticatedUserEmail) {
        return books;
      } else {
        throw new ApolloError("Invalid auth");
      }
    },
    login: (parent, args, context, info) => {
      const user = usersDB.find((dbUser) => dbUser.email === args.email);
      if (user && bcrypt.compareSync(args.password, user.hash)) {
        const token = jwt.sign(
          {
            user: user.email,
          },
          jwtKey
        );
        return token;
      } else {
        throw new ApolloError("Invalid credentials");
      }
    },
    // add register
  },
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: ({ req }) => {
    const token = req.headers.authorization;
    if (token) {
      let payload;
      try {
        payload = jwt.verify(token, jwtKey);
        return { authenticatedUserEmail: payload.user };
      } catch (err) {}
    }
  },
});

server.listen().then(({ url }) => {
  console.log(`🚀  Server ready at ${url}`);
});
