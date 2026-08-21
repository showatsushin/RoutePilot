import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from './App';

const loadApp = async () => {
  render(<App />);
  expect(await screen.findByText(/本日の配送計画は/)).toBeInTheDocument();
  expect(screen.queryByText('Rev.1')).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: '指示を送信' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'サンプルデータで試す' }));
  await screen.findByText('今日の配送');
};

describe('App vertical slice', () => {
  it('変更案を承認するとRev.2と新しい時間指定を反映する', async () => {
    await loadApp();
    expect(screen.getByText('Rev.1')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '指示を送信' }));
    await screen.findByText('変更案を確認');
    expect(screen.getByText(/現在の確定計画 Rev.1 はまだ変更されていません/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '承認して適用' }));
    await waitFor(() => expect(screen.getByText('Rev.2')).toBeInTheDocument());
    expect(screen.getByText(/変更を適用しました。配送計画をRev.2/)).toBeInTheDocument();
    expect(screen.getAllByText('15:00–17:00').length).toBeGreaterThan(0);
  });

  it('変更案を却下してもRev.1を維持する', async () => {
    await loadApp();
    fireEvent.click(screen.getByRole('button', { name: '指示を送信' }));
    await screen.findByText('変更案を確認');

    fireEvent.click(screen.getByRole('button', { name: '却下' }));
    expect(await screen.findByText(/現在の計画はRev.1のままです/)).toBeInTheDocument();
    expect(screen.getByText('Rev.1')).toBeInTheDocument();
    expect(screen.queryByText('変更案を確認')).not.toBeInTheDocument();
  });
});
