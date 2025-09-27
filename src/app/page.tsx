'use client';

import React, { useEffect } from 'react';
import { MainLayout } from '@/components/Layout/MainLayout';
import { useEditorStore } from '@/store';
import { FileNode } from '@/types';

export default function HomePage() {
  const { setFileTree } = useEditorStore();

  // Initialize with sample project structure
  useEffect(() => {
    const sampleFileTree: FileNode[] = [
      {
        id: 'src',
        name: 'src',
        path: 'src',
        type: 'directory',
        isOpen: true,
        children: [
          {
            id: 'src/components',
            name: 'components',
            path: 'src/components',
            type: 'directory',
            children: [
              {
                id: 'src/components/App.tsx',
                name: 'App.tsx',
                path: 'src/components/App.tsx',
                type: 'file',
                language: 'typescript',
                content: `import React from 'react';
import './App.css';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>Welcome to NeoAI IDE</h1>
        <p>
          Start building amazing applications with AI assistance!
        </p>
        <button onClick={() => console.log('Hello from AI!')}>
          Click me
        </button>
      </header>
    </div>
  );
}

export default App;`,
                size: 425,
                lastModified: new Date(),
              },
              {
                id: 'src/components/Button.tsx',
                name: 'Button.tsx',
                path: 'src/components/Button.tsx',
                type: 'file',
                language: 'typescript',
                content: `import React from 'react';

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  onClick,
  variant = 'primary',
  disabled = false,
}) => {
  const baseClasses = 'px-4 py-2 rounded-lg font-medium transition-colors duration-150';
  const variantClasses = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white',
    secondary: 'bg-gray-600 hover:bg-gray-700 text-white',
  };

  return (
    <button
      className={\`\${baseClasses} \${variantClasses[variant]}\`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
};`,
                size: 678,
                lastModified: new Date(),
              },
            ],
          },
          {
            id: 'src/utils',
            name: 'utils',
            path: 'src/utils',
            type: 'directory',
            children: [
              {
                id: 'src/utils/helpers.ts',
                name: 'helpers.ts',
                path: 'src/utils/helpers.ts',
                type: 'file',
                language: 'typescript',
                content: `/**
 * Utility functions for the application
 */

export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export function classNames(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}`,
                size: 612,
                lastModified: new Date(),
              },
            ],
          },
          {
            id: 'src/index.tsx',
            name: 'index.tsx',
            path: 'src/index.tsx',
            type: 'file',
            language: 'typescript',
            content: `import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './components/App';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`,
            size: 285,
            lastModified: new Date(),
          },
        ],
      },
      {
        id: 'public',
        name: 'public',
        path: 'public',
        type: 'directory',
        children: [
          {
            id: 'public/index.html',
            name: 'index.html',
            path: 'public/index.html',
            type: 'file',
            language: 'html',
            content: `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <link rel="icon" href="%PUBLIC_URL%/favicon.ico" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#000000" />
    <meta name="description" content="NeoAI IDE Sample Project" />
    <title>NeoAI IDE Sample</title>
  </head>
  <body>
    <noscript>You need to enable JavaScript to run this app.</noscript>
    <div id="root"></div>
  </body>
</html>`,
            size: 512,
            lastModified: new Date(),
          },
        ],
      },
      {
        id: 'package.json',
        name: 'package.json',
        path: 'package.json',
        type: 'file',
        language: 'json',
        content: `{
  "name": "neoai-sample-project",
  "version": "0.1.0",
  "private": true,
  "dependencies": {
    "@types/node": "^16.18.0",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-scripts": "5.0.1",
    "typescript": "^4.9.0",
    "web-vitals": "^2.1.0"
  },
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "test": "react-scripts test",
    "eject": "react-scripts eject"
  },
  "eslintConfig": {
    "extends": [
      "react-app",
      "react-app/jest"
    ]
  },
  "browserslist": {
    "production": [
      ">0.2%",
      "not dead",
      "not op_mini all"
    ],
    "development": [
      "last 1 chrome version",
      "last 1 firefox version",
      "last 1 safari version"
    ]
  }
}`,
        size: 892,
        lastModified: new Date(),
      },
      {
        id: 'README.md',
        name: 'README.md',
        path: 'README.md',
        type: 'file',
        language: 'markdown',
        content: `# NeoAI IDE Sample Project

Welcome to your first project in NeoAI IDE! This is a sample React TypeScript project to help you get started.

## Features

- 🚀 React 18 with TypeScript
- 🎨 Modern component architecture
- 🔧 Utility functions and helpers
- 📝 Well-documented code

## Getting Started

1. Explore the file structure in the left panel
2. Open any file to start editing
3. Use the AI assistant to help with coding tasks
4. Run the project using the play button

## AI Assistant Commands

Try asking the AI assistant:
- "Explain this component"
- "Add error handling to this function"
- "Generate tests for this code"
- "Refactor this component"

## Next Steps

- Create new components
- Add more utility functions
- Implement new features
- Deploy your application

Happy coding with NeoAI IDE! ✨`,
        size: 756,
        lastModified: new Date(),
      },
    ];

    setFileTree(sampleFileTree);
  }, [setFileTree]);

  return <MainLayout />;
}
