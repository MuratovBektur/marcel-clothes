const required = (name: string): never => {
  throw new Error(`${name} not defined`);
};

function getDBVariables() {
  return {
    DB_USER: process.env['DB_USER'] ?? required('DB_USER'),
    DB_PASSWORD: process.env['DB_PASSWORD'] ?? required('DB_PASSWORD'),
    DB_NAME: process.env['DB_NAME'] ?? required('DB_NAME'),
    DB_PORT: process.env['DB_PORT'] ?? required('DB_PORT'),
    DB_HOST: process.env['DB_HOST'] ?? required('DB_HOST'),
  };
}

export default getDBVariables;
