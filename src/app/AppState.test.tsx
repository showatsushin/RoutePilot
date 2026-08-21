import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';

const startSample = async () => {
  fireEvent.click(screen.getByRole('button', { name: 'サンプルデータで試す' }));
  await screen.findByText('今日の配送');
};

const attachEvidence = () => {
  const inputs = [...document.querySelectorAll<HTMLInputElement>('input[type="file"]')];
  fireEvent.change(inputs[0], { target: { files: [new File(['meter'], 'meter.png', { type: 'image/png' })] } });
  fireEvent.change(inputs[1], { target: { files: [new File(['vehicle'], 'vehicle.png', { type: 'image/png' })] } });
};

describe('EMPTY・サンプル・完全リセット', () => {
  beforeEach(() => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn((file: File) => `blob:${file.name}`) });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
  });
  afterEach(() => vi.restoreAllMocks());

  it('初回は計画・revision・proposal・AI操作のないEMPTY', async () => {
    const { container } = render(<App />);
    expect(await screen.findByText(/本日の配送計画は/)).toBeInTheDocument();
    expect(document.querySelector('[data-app-state="EMPTY"]')).toBeInTheDocument();
    expect(container.firstChild).toHaveAttribute('data-current-plan', 'null');
    expect(container.firstChild).toHaveAttribute('data-proposed-plan', 'null');
    expect(screen.queryByText(/Rev\./)).not.toBeInTheDocument();
    expect(screen.queryByText('変更案を確認')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '指示を送信' })).not.toBeInTheDocument();
    expect(screen.getByText(/AI配車アシスタントと乗務前点呼/)).toBeInTheDocument();
  });

  it('EMPTYの点呼ビューでは点呼を開始できない', async () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'ドライバー点呼' }));
    expect(await screen.findByText(/本日の配送計画を作成すると/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '乗務前点呼を開始' })).not.toBeInTheDocument();
  });

  it('サンプルデータを明示的に読み込んだ場合だけRev.1を生成する', async () => {
    render(<App />);
    expect(await screen.findByText('EMPTY')).toBeInTheDocument();
    await startSample();
    expect(screen.getByText('Rev.1')).toBeInTheDocument();
    expect(screen.getByText('PLANNED')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '指示を送信' })).toBeEnabled();
  });

  it('resetでproposalと点呼結果を消し、サンプルを自動復帰しない', async () => {
    render(<App />); await startSample();
    fireEvent.click(screen.getByRole('button', { name: 'ドライバー点呼' }));
    fireEvent.click(screen.getByRole('button', { name: '乗務前点呼を開始' })); attachEvidence();
    fireEvent.click(screen.getByRole('button', { name: '内容を確認' })); fireEvent.click(screen.getByRole('button', { name: '点呼を確定' }));
    fireEvent.click(screen.getByRole('button', { name: '配送管理画面で確認' }));
    fireEvent.click(screen.getByRole('button', { name: '指示を送信' })); await screen.findByText('変更案を確認');
    fireEvent.click(screen.getByRole('button', { name: /リセット/ }));

    expect(window.confirm).toHaveBeenCalledWith('現在の配送計画、点呼結果、変更案をすべてリセットします。よろしいですか？');
    expect(await screen.findByText(/本日の配送計画は/)).toBeInTheDocument();
    expect(screen.queryByText('変更案を確認')).not.toBeInTheDocument();
    expect(screen.queryByText('点呼済 / 運行可')).not.toBeInTheDocument();
    expect(screen.queryByText(/Rev\./)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'サンプルデータで試す' })).toBeInTheDocument();
  });

  it('写真draft中のresetでobject URLを破棄してEMPTYへ戻る', async () => {
    render(<App />); await startSample();
    fireEvent.click(screen.getByRole('button', { name: 'ドライバー点呼' }));
    fireEvent.click(screen.getByRole('button', { name: '乗務前点呼を開始' })); attachEvidence();
    fireEvent.click(screen.getByRole('button', { name: /リセット/ }));
    await waitFor(() => expect(URL.revokeObjectURL).toHaveBeenCalledTimes(2));
    expect(screen.getByText(/本日の配送計画は/)).toBeInTheDocument();
  });
});
