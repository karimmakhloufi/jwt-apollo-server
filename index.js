const { ApolloServer, gql, ApolloError } = require("apollo-server");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const jwtKey = "my_secret_key";

// A schema is a collection of type definitions (hence "typeDefs")
// that together define the "shape" of queries that are executed against
// your data.
const typeDefs = gql`
  type Book {
    title: String
    author: String
  }
  type User {
    email: String
    password: String
  }
  type Query {
    books: [Book]
  }
  type Mutation {
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

const users = [
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
      console.log("context", context);
      if (context.user) {
        return books;
      } else {
        throw new ApolloError("Invalid auth");
      }
    },
  },
  Mutation: {
    login: (parent, args, context, info) => {
      const user = users.find((el) => el.email === args.email);
      if (user && bcrypt.compareSync(args.password, user.hash)) {
        const token = jwt.sign(
          {
            user: user.email,
          },
          jwtKey,
          {
            algorithm: "HS256",
          }
        );
        return token;
      } else {
        throw new ApolloError("Invalid credentials");
      }
    },
  },
};

// The ApolloServer constructor requires two parameters: your schema
// definition and your set of resolvers.
const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: ({ req }) => {
    // console.log("auth", req.headers.authorization);
    const token = req.headers.authorization;
    if (token) {
      // console.log("token", token);
      let payload;
      try {
        payload = jwt.verify(token, jwtKey);
        // console.log("payload", payload);
        return { user: payload.user };
      } catch (err) {
        // console.log("invalid token");
      }
    }
  },
});

// The `listen` method launches a web server.
server.listen().then(({ url }) => {
  console.log(`🚀  Server ready at ${url}`);
});
