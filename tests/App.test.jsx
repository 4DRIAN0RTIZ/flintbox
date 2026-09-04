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

  it('supports keyboard panel navigation and running with Enter', async () => {
    render(<App />);

    const inputPane = screen.getByText('Input').closest('.pane');
    const outputPane = screen.getByText('Output').closest('.pane');
    const toolsPane = screen.getByRole('tablist', { name: 'Select tool' });

    expect(inputPane).toHaveClass('panel-focused');

    fireEvent.keyDown(document, { key: 'ArrowUp' });
    expect(toolsPane).toHaveClass('panel-focused');

    fireEvent.keyDown(document, { key: 'ArrowDown' });
    expect(inputPane).toHaveClass('panel-focused');

    fireEvent.keyDown(document, { key: 'j' });
    expect(outputPane).toHaveClass('panel-focused');

    fireEvent.keyDown(document, { key: 'Enter' });
    await waitFor(() => {
      expect(screen.getByLabelText('Command output')).toHaveTextContent('RESULT LINE');
    });
  });

  it('enters input edit mode with i and exits with Escape', () => {
    render(<App />);

    const inputPane = screen.getByText('Input').closest('.pane');
    const textarea = screen.getByLabelText('Input data');

    fireEvent.keyDown(document, { key: 'i' });
    expect(textarea).toHaveFocus();
    expect(inputPane).toHaveClass('panel-editing');

    fireEvent.keyDown(textarea, { key: 'Escape' });
    expect(inputPane).toHaveClass('panel-focused');
    expect(inputPane).not.toHaveClass('panel-editing');
  });

  it('handles gg, G and / shortcuts in output panel', async () => {
    global.fetch = vi.fn(async () => runOk(`${'line\n'.repeat(200)}end`));
    const promptSpy = vi.spyOn(window, 'prompt').mockReturnValue('line');
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /Run/ }));
    await waitFor(() => {
      expect(screen.getByLabelText('Command output')).toHaveTextContent('end');
    });

    fireEvent.keyDown(document, { key: 'j' });

    const outputPre = screen.getByLabelText('Command output');
    Object.defineProperty(outputPre, 'scrollHeight', { value: 1000, configurable: true });
    Object.defineProperty(outputPre, 'clientHeight', { value: 200, configurable: true });
    outputPre.scrollTop = 500;

    fireEvent.keyDown(document, { key: 'g' });
    fireEvent.keyDown(document, { key: 'g' });
    expect(outputPre.scrollTop).toBe(0);

    fireEvent.keyDown(document, { key: 'G' });
    expect(outputPre.scrollTop).toBe(1000);

    fireEvent.keyDown(document, { key: '/' });
    expect(promptSpy).toHaveBeenCalledWith('Search output', '');

    promptSpy.mockRestore();
  });
});
