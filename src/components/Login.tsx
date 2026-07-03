import { useState, type FormEvent } from 'react';
import * as Icons from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { signInWithGoogle, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, auth } from '../lib/firebase';
import { useToast } from './Toast';

type LoginProps = {
  readonly onBack?: () => void;
};

type LoginMode = 'login' | 'register' | 'select';

function getErrorCode(error: unknown): string {
  if (typeof error !== 'object' || error === null || Array.isArray(error) || !('code' in error)) {
    return '';
  }
  const code = error.code;
  return typeof code === 'string' ? code : '';
}

export default function Login({ onBack }: LoginProps) {
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<LoginMode>('select');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const { showToast } = useToast();

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      await signInWithGoogle();
      showToast('登录成功', 'success');
      onBack?.();
    } catch (error) {
      console.error('Login failed:', error instanceof Error ? error.message : String(error));
      showToast('登录失败，请重试', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    try {
      if (mode === 'register') {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        if (displayName) {
          await updateProfile(userCredential.user, { displayName });
        }
        showToast('注册成功', 'success');
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        showToast('登录成功', 'success');
      }
      onBack?.();
    } catch (error) {
      console.error('Email auth failed:', error instanceof Error ? error.message : String(error));
      const code = getErrorCode(error);
      let message = '操作失败，请检查账号密码';
      if (code === 'auth/operation-not-allowed') {
        message = '后台尚未启用邮箱登录';
      } else if (code === 'auth/email-already-in-use') {
        message = '该邮箱已注册';
      } else if (code === 'auth/network-request-failed') {
        message = '网络连接失败';
      } else if (code === 'auth/wrong-password') {
        message = '密码错误';
      } else if (code === 'auth/user-not-found') {
        message = '用户不存在';
      }
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-full items-center justify-center px-7 py-[calc(env(safe-area-inset-top)+28px)] text-white">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center justify-between">
          <button type="button" onClick={mode === 'select' ? onBack : () => setMode('select')} className="cm-chip cm-press grid h-11 w-11 place-items-center rounded-full" aria-label={mode === 'select' ? '关闭登录' : '返回'}>
            {mode === 'select' ? <Icons.X className="h-5 w-5" /> : <Icons.ArrowLeft className="h-5 w-5" />}
          </button>
          <span className="cm-status-pill rounded-full px-3 py-1 text-xs font-bold text-[var(--cm-green)]">
            Cloud Sync
          </span>
        </div>

        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.24 }}>
          <div className="grid h-16 w-16 place-items-center rounded-full bg-[var(--cm-purple)] text-black">
            <Icons.Sparkles className="h-8 w-8" />
          </div>
          <h1 className="mt-6 text-[34px] font-black">{mode === 'register' ? '创建账号' : '欢迎回来'}</h1>
          <p className="mt-2 text-[15px] leading-relaxed text-[var(--cm-text-soft)]">
            登录后同步你的 AI 自动账本。
          </p>
        </motion.div>

        <AnimatePresence mode="wait">
          {mode === 'select' ? (
            <motion.div key="select" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="mt-8 space-y-3">
              <button type="button" onClick={handleGoogleLogin} disabled={loading} className="cm-action-row cm-press flex h-14 w-full items-center justify-center gap-3 rounded-[22px] font-bold disabled:opacity-50">
                <Icons.LogIn className="h-5 w-5 text-[var(--cm-purple)]" />
                使用 Google 账号登录
              </button>
              <button type="button" onClick={() => setMode('login')} className="cm-primary cm-press flex h-14 w-full items-center justify-center gap-3 rounded-[22px] font-bold">
                <Icons.Mail className="h-5 w-5" />
                使用邮箱登录
              </button>
              <button type="button" onClick={() => setMode('register')} className="cm-chip cm-press h-12 w-full rounded-[20px] text-sm font-bold">
                创建新账号
              </button>
            </motion.div>
          ) : (
            <motion.form key="email-form" initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }} onSubmit={handleEmailAuth} className="mt-8 space-y-4">
              {mode === 'register' && (
                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-[var(--cm-text-soft)]">昵称</span>
                  <input type="text" required value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="您的称呼" autoComplete="name" className="cm-input h-14 w-full rounded-[22px] px-5 text-[16px]" />
                </label>
              )}
              <label className="block">
                <span className="mb-2 block text-sm font-bold text-[var(--cm-text-soft)]">邮箱</span>
                <input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" autoComplete="email" className="cm-input h-14 w-full rounded-[22px] px-5 text-[16px]" />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-bold text-[var(--cm-text-soft)]">密码</span>
                <input type="password" required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="输入密码" autoComplete={mode === 'register' ? 'new-password' : 'current-password'} className="cm-input h-14 w-full rounded-[22px] px-5 text-[16px]" />
              </label>
              <button type="submit" disabled={loading} className="cm-primary cm-press h-14 w-full rounded-[22px] font-black disabled:opacity-50">
                {loading ? '处理中' : mode === 'register' ? '立即注册' : '登录'}
              </button>
            </motion.form>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
