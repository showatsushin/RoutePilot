import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { REQUIRED_IMPORT_COLUMNS } from '../features/import/importValidation';
import { App } from './App';

const csvFile = (content: string, name = 'delivery-plan.csv') => ({ name, text: async () => content } as File);
const validCsv = [
  REQUIRED_IMPORT_COLUMNS.join(','),
  'D001,青葉商事,中央区新川 1-12-3,10:00,12:00,15,4,normal,,午前希望',
  'D002,東都メディカル,港区海岸 2-4-8,09:00,11:00,15,5,high,1号車,',
].join('\n');

const upload = (file: File) => {
  const input = document.querySelector<HTMLInputElement>('input[type="file"]')!;
  fireEvent.change(input, { target: { files: [file] } });
};

describe('配送計画import UI', () => {
  it('previewでは現計画を維持し、confirm後にRev.1を生成してAI変更も使える', async () => {
    const { container } = render(<App />);
    await screen.findByText(/本日の配送計画は/);
    fireEvent.click(screen.getByRole('button', { name: /配送計画を読み込む/ }));
    upload(csvFile(validCsv));

    await screen.findByText(/検証完了/);
    expect(container.querySelector('.header-metrics')).not.toBeInTheDocument();
    expect(screen.queryByText('Rev.1')).not.toBeInTheDocument();
    expect(screen.getByText(/本日の配送計画は/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'この配送計画を使用' }));
    await waitFor(() => expect(container.querySelector('.header-metrics strong')?.textContent).toBe('2件'));
    expect(screen.getByText('Rev.1')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '指示を送信' }));
    await screen.findByText('変更案を確認');
    expect(screen.getByText('Rev.1 → 2')).toBeInTheDocument();
  });

  it('不正ファイルは行エラーを表示しcurrentPlanを変更しない', async () => {
    const { container } = render(<App />);
    await screen.findByText(/本日の配送計画は/);
    fireEvent.click(screen.getByRole('button', { name: /配送計画を読み込む/ }));
    upload(csvFile(`${REQUIRED_IMPORT_COLUMNS.join(',')}\nD001,未知株式会社,未知市1-1,xx,12:00,15,4,normal,,`));

    await screen.findByText(/件のエラー/);
    expect(screen.getByText('この無料デモでは未対応の住所です')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'この配送計画を使用' })).toBeDisabled();
    expect(container.querySelector('.header-metrics')).not.toBeInTheDocument();
    expect(screen.queryByText('Rev.1')).not.toBeInTheDocument();
    expect(screen.getByText(/本日の配送計画は/)).toBeInTheDocument();
  });
});
