import { render, screen } from '@testing-library/react';
import App from './App';

test('renders header text', () => {
  render(<App />);
  const title = screen.getByText(/Prime Video Player Demo/i);
  expect(title).toBeInTheDocument();
});
