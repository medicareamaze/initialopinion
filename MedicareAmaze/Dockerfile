FROM node:carbon

# Create app directory
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app


# Install app dependencies
COPY package.json ./
RUN npm install
RUN ls /usr/src/app/node_modules

# Bundle app source
COPY . .


EXPOSE 8080
CMD [ "npm", "start" ]