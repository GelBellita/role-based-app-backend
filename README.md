This project is a backend REST API built using **Node.js** and **Express.js**.  
It demonstrates how to implement **user authentication** and **role-based access control (RBAC)** using **JWT tokens** and **bcrypt password hashing**.
 
## Project Description
The application allows users to:
- Register a new account with a hashed password
- Log in and receive a signed **JWT token**
- Access protected routes using the token
- View their own profile when authenticated
- Access an **admin-only dashboard** if their role is `admin`
- Access public content without any login required
 
The backend is built with **Express.js**, while authentication is handled using **jsonwebtoken** and **bcryptjs**.