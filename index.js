const cors = require("cors");
const express = require("express");
const { ApolloServer, gql, ApolloError } = require("apollo-server-express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");

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
  },
  Mutation: {
    login: (parent, args, context, info) => {
      const user = usersDB.find((dbUser) => dbUser.email === args.email);
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
        context.res.cookie("token", token, {
          maxAge: 86_400_000, // try with 10_000
          httpOnly: true, // if false, document.cookie in frontend works
          secure: true, // only send to https or localhost
        });
        return "you are logged in";
      } else {
        throw new ApolloError("Invalid credentials");
      }
    },
  },
};

const app = express();
const port = 4000;

const corsOptions = {
  origin: "http://localhost:3000",
  credentials: true,
};
app.use(cors(corsOptions));
app.use(cookieParser());

const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: ({ res, req }) => {
    const token = req.cookies.token;
    if (token) {
      let payload;
      try {
        payload = jwt.verify(token, jwtKey);
        return { res, authenticatedUserEmail: payload.user };
      } catch (err) {}
    } else {
      return { res };
    }
  },
});

server.applyMiddleware({ app, path: "/graphql", cors: false }); // we still use cors from the cors middleware, try to request from 192.168 to check
app.listen(port, () => {
  console.log(`Graphql app listening at http://localhost:${port}/graphql`);
});
