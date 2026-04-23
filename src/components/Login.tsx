import React, { useState } from 'react';
import * as Icons from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { signInWithGoogle, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, auth } from '../lib/firebase';
import { useToast } from './Toast';

interface LoginProps {
  onBack?: () => void;
}

export default function Login({ onBack }: LoginProps) {
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'login' | 'register' | 'select'>('select');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const { showToast } = useToast();

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      await signInWithGoogle();
      showToast('登录成功', 'success');
      if (onBack) onBack();
    } catch (err) {
      console.error('Login failed:', err);
      showToast('登录失败，请重试', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
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
      if (onBack) onBack();
    } catch (err: any) {
      console.error('Email auth failed:', err);
      let msg = '操作失败，请检查账号密码';
      if (err.code === 'auth/operation-not-allowed') {
        msg = '后台尚未启用邮箱登录，请在控制台开启';
      } else if (err.code === 'auth/email-already-in-use') {
        msg = '该邮箱已注册，请使用“登录”模式';
      } else if (err.code === 'auth/network-request-failed') {
        msg = '网络连接失败，请检查是否启用了广告拦截插件';
      } else if (err.code === 'auth/wrong-password') {
        msg = '密码错误';
      } else if (err.code === 'auth/user-not-found') {
        msg = '用户不存在';
      }
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-full px-8 text-center relative z-10 py-12">
      <div className="w-full max-w-sm">
        {mode !== 'select' && (
          <button 
            onClick={() => setMode('select')}
            className="absolute top-8 left-8 p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          >
            <Icons.ArrowLeft className="w-5 h-5 dark:text-white" />
          </button>
        )}
        
        {onBack && mode === 'select' && (
          <button 
            onClick={onBack}
            className="absolute top-8 right-8 p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          >
            <Icons.X className="w-5 h-5 dark:text-white" />
          </button>
        )}

        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="mb-10"
        >
          <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-[1.5rem] flex items-center justify-center shadow-2xl mb-6 mx-auto">
            <Icons.CircleDollarSign className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight mb-2 dark:text-white">
            {mode === 'register' ? '创建账号' : '欢迎回来'}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {mode === 'register' ? '开启您的智能记账之旅' : '登录以同步您的财务数据'}
          </p>
        </motion.div>

        <AnimatePresence mode="wait">
          {mode === 'select' ? (
            <motion.div
              key="select"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <button
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 py-3.5 px-6 rounded-2xl font-medium text-gray-700 dark:text-gray-200 shadow-sm hover:bg-gray-50 dark:hover:bg-zinc-800 transition-all active:scale-[0.98] disabled:opacity-50"
              >
                <Icons.LogIn className="w-5 h-5 text-indigo-500" />
                使用 Google 账号登录
              </button>

              <button
                onClick={() => setMode('login')}
                className="w-full flex items-center justify-center gap-3 bg-indigo-600 py-3.5 px-6 rounded-2xl font-medium text-white shadow-lg shadow-indigo-500/20 hover:bg-indigo-700 transition-all active:scale-[0.98]"
              >
                <Icons.Mail className="w-5 h-5" />
                使用邮箱登录
              </button>

              <div className="flex items-center gap-4 py-2">
                <div className="h-px flex-1 bg-gray-200 dark:bg-zinc-800"></div>
                <span className="text-xs text-gray-400">或者</span>
                <div className="h-px flex-1 bg-gray-200 dark:bg-zinc-800"></div>
              </div>

              <button
                onClick={() => setMode('register')}
                className="text-sm text-indigo-600 dark:text-indigo-400 font-medium hover:underline"
              >
                还没有账号？立即注册
              </button>
            </motion.div>
          ) : (
            <motion.form
              key="email-form"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              onSubmit={handleEmailAuth}
              className="space-y-4 text-left"
            >
              {mode === 'register' && (
                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 ml-1 mb-1 block">昵称</label>
                  <input
                    type="text"
                    required={mode === 'register'}
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="您的称呼"
                    className="w-full bg-gray-100 dark:bg-zinc-900 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              )}
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 ml-1 mb-1 block">邮箱</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full bg-gray-100 dark:bg-zinc-900 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 ml-1 mb-1 block">密码</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-gray-100 dark:bg-zinc-900 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 py-4 px-6 rounded-2xl font-semibold text-white shadow-lg active:scale-[0.98] transition-all disabled:opacity-50 mt-2"
              >
                {loading ? '处理中...' : (mode === 'register' ? '立即注册' : '登 录')}
              </button>
            </motion.form>
          )}
        </AnimatePresence>

        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-12">
          登录即代表您同意我们的隐私政策和用户协议
        </p>
      </div>

      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full -z-10 blur-[120px] opacity-10 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-indigo-500 rounded-full"></div>
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-purple-500 rounded-full"></div>
      </div>
    </div>
  );
}
