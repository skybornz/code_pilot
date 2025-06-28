export type CodeFile = {
  id: string;
  name: string;
  language: string;
  content: string;
};

export const dummyFiles: CodeFile[] = [
  {
    id: '1',
    name: 'button.tsx',
    language: 'typescript',
    content: `import React from 'react';

type ButtonProps = {
  text: string;
  onClick: () => void;
}

const Button = ({ text, onClick }: ButtonProps) => {
  // A simple button component
  return (
    <button onClick={onClick} style={{ padding: '10px 20px', borderRadius: '5px', border: 'none', background: '#007bff', color: 'white', cursor: 'pointer' }}>
      {text}
    </button>
  );
};

export default Button;
`
  },
  {
    id: '2',
    name: 'utils.js',
    language: 'javascript',
    content: `// Utility function to add two numbers
function add(a, b) {
  return a + b;
}

// This function has a potential bug for large numbers
function fibonacci(n) {
    if (n <= 1) return n;
    let a = 0, b = 1;
    for (let i = 2; i <= n; i++) {
        let temp = a + b;
        a = b;
        b = temp;
    }
    return b;
}
`
  },
  {
    id: '3',
    name: 'styles.css',
    language: 'css',
    content: `.container {
  display: flex;
  flex-direction: column;
  align-itemss: center; /* Typo here */
  justify-content: center;
  height: 100vh;
}

.title {
  font-size: 24px;
  color: #333;
}
`
  },
  {
    id: '4',
    name: 'server.py',
    language: 'python',
    content: `from flask import Flask
app = Flask(__name__)

@app.route('/')
def hello_world():
    return 'Hello, World!'

def unused_function():
    pass
`
  }
];
