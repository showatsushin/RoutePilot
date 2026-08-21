import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from './App';

describe('端末別の画面構造', () => {
  it('計画作成後はdesktop用3ペインとスマホ用切替を同じ業務状態で提供する', async () => {
    const { container } = render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'サンプルデータで試す' }));
    await screen.findByText('今日の配送');
    const workspace = container.querySelector('.workspace')!;
    expect(workspace.querySelector('.deliveries-panel')).toBeInTheDocument();
    expect(workspace.querySelector('.map-panel')).toBeInTheDocument();
    expect(workspace.querySelector('.assistant-panel')).toBeInTheDocument();

    const tabs = screen.getByRole('navigation', { name: '配送管理パネル' });
    expect(tabs).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '地図' }));
    expect(workspace).toHaveAttribute('data-mobile-panel', 'map');
    fireEvent.click(screen.getByRole('button', { name: 'AI' }));
    expect(workspace).toHaveAttribute('data-mobile-panel', 'assistant');
    fireEvent.click(screen.getByRole('button', { name: '配送' }));
    expect(workspace).toHaveAttribute('data-mobile-panel', 'deliveries');
  });

  it('DriverCheckViewはworkspace外の単一カラム構造を使う', async () => {
    const { container } = render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'サンプルデータで試す' })); await screen.findByText('今日の配送');
    fireEvent.click(screen.getByRole('button', { name: 'ドライバー点呼' })); fireEvent.click(screen.getByRole('button', { name: '乗務前点呼を開始' }));
    expect(container.querySelector('.driver-phone .check-form')).toBeInTheDocument();
    expect(container.querySelector('.driver-page .workspace')).not.toBeInTheDocument();
  });
});
