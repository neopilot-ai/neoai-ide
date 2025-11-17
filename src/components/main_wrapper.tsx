import { Suspense } from 'react';
import Main from './main';

export default function MainWrapper() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Main />
    </Suspense>
  );
}