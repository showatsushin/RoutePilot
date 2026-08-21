import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';

const openDriverView = async () => {
  render(<App />);
  expect(await screen.findByText(/本日の配送計画は/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'ドライバー点呼' }));
  expect(screen.getByText(/本日の配送計画を作成すると/)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: '乗務前点呼を開始' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '配送管理へ戻る' }));
  fireEvent.click(screen.getByRole('button', { name: 'サンプルデータで試す' }));
  await screen.findByText('今日の配送');
  fireEvent.click(screen.getByRole('button', { name: 'ドライバー点呼' }));
  await screen.findByText('本日の乗務前点呼');
};

const attachEvidence = () => {
  const inputs = [...document.querySelectorAll<HTMLInputElement>('input[type="file"]')];
  fireEvent.change(inputs[0], { target: { files: [new File(['meter'], 'meter.png', { type: 'image/png' })] } });
  fireEvent.change(inputs[1], { target: { files: [new File(['vehicle'], 'vehicle.png', { type: 'image/png' })] } });
};

describe('ドライバー乗務前点呼UI', () => {
  beforeEach(() => {
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn((file: File) => `blob:${file.name}`) });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
  });

  it('draftは管理画面へ反映せず、写真はローカルpreviewだけ行う', async () => {
    await openDriverView();
    fireEvent.click(screen.getByRole('button', { name: '乗務前点呼を開始' }));
    attachEvidence();
    expect(screen.getByAltText('アルコール検知器写真プレビュー')).toHaveAttribute('src', 'blob:meter.png');
    expect(URL.createObjectURL).toHaveBeenCalledTimes(2);

    fireEvent.click(screen.getByRole('button', { name: '配送管理' }));
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(2);
    expect(screen.getAllByText('点呼未実施')).toHaveLength(2);
    expect(screen.getByText('Rev.1')).toBeInTheDocument();
  });

  it('全項目OKのcompletedだけを運行可として反映し計画は変更しない', async () => {
    await openDriverView();
    fireEvent.click(screen.getByRole('button', { name: '乗務前点呼を開始' }));
    attachEvidence();
    fireEvent.click(screen.getByRole('button', { name: '内容を確認' }));
    expect(screen.getByText('運行可')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '点呼を確定' }));
    fireEvent.click(screen.getByRole('button', { name: '配送管理画面で確認' }));

    expect(screen.getByText('点呼済 / 運行可')).toBeInTheDocument();
    expect(screen.getByText('Rev.1')).toBeInTheDocument();
  });

  it('2号車blockedから再配車proposalを承認してRev.2へ更新する', async () => {
    await openDriverView();
    fireEvent.change(screen.getByLabelText('ドライバー'), { target: { value: 'driver-02' } });
    fireEvent.click(screen.getByRole('button', { name: '乗務前点呼を開始' }));
    fireEvent.click(screen.getByRole('button', { name: '要確認' }));
    attachEvidence();
    fireEvent.click(screen.getByRole('button', { name: '内容を確認' }));
    expect(screen.getByText('運行不可')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '点呼を確定' }));
    fireEvent.click(screen.getByRole('button', { name: '配送管理画面で確認' }));

    expect(await screen.findByText(/2号車は乗務前点呼で運行不可/)).toBeInTheDocument();
    expect(screen.getByText('Rev.1')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '再配車案を作成' }));
    await screen.findByText('変更案を確認');
    expect(screen.getByText(/現在の確定計画 Rev.1 はまだ変更されていません/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '承認して適用' }));
    await waitFor(() => expect(screen.getByText('Rev.2')).toBeInTheDocument());
  });
});
