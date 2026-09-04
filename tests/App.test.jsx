import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../src/App.jsx';

const runOk = (stdout) => ({
  ok: true,
  status: 200,
  json: async () => ({ stdout, stderr: '', exitCode: 0 }),
});

describe('<App /> container', () => {
  beforeEach(() => {
    global.fetch = vi.fn(async () => runOk('RESULT LINE'));
  });

  it('renders the tool tabs with jq active and its default params', () => {
    render(<App />);

    expect(screen.getByRole('tab', { name: 'jq' })).toHaveClass('active');
    expect(screen.getByLabelText('Command parameters')).toHaveValue('.[] | .name');
  });

  it('shows the app version next to the brand name', () => {
    render(<App />);

    expect(screen.getByText(/^v\d+\.\d+\.\d+/)).toBeInTheDocument();
  });

  it('switching tool updates params, label and command preview', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('tab', { name: 'grep' }));

    expect(screen.getByLabelText('Command parameters')).toHaveValue('-i root');
    const preview = screen.getByLabelText('Assembled command preview');
    expect(preview).toHaveTextContent('grep');
    expect(preview).toHaveTextContent('-i root');
    expect(preview).toHaveTextContent('stdin');
  });

  it('runs the current command through the api client and renders stdout', async () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /Run/ }));

    await waitFor(() => {
      expect(screen.getByLabelText('Command output')).toHaveTextContent('RESULT LINE');
    });
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/run',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(screen.getByRole('status')).toHaveTextContent('exit 0');
  });

  it('does not call the backend when params are empty', () => {
    render(<App />);

    fireEvent.change(screen.getByLabelText('Command parameters'), { target: { value: '   ' } });
    fireEvent.click(screen.getByRole('button', { name: /Run/ }));

    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('reveals the HTTP fetch panel when the http source is selected', () => {
    render(<App />);

    expect(screen.queryByLabelText('Request URL')).toBeNull();
    fireEvent.click(screen.getByRole('tab', { name: 'http' }));
    expect(screen.getByLabelText('Request URL')).toBeInTheDocument();
  });

  it('records history after a successful run', async () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /Run/ }));

    await waitFor(() => {
      const chips = screen.getByLabelText('Command history');
      expect(chips).toHaveTextContent(/jq\s+\.\[\] \| \.name/);
    });
  });
});
