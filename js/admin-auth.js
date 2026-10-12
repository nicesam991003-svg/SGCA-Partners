(function (root) {
    'use strict';
    const administratorEmail = 'sim@sgca-partners.com';
    function isAdministrator(user) {
        return Boolean(user && user.emailVerified && user.email?.toLowerCase() === administratorEmail &&
            user.providerData?.some(provider => provider.providerId === 'google.com'));
    }
    if (typeof module !== 'undefined') module.exports = { isAdministrator };
    if (!root.document) return;
    const auth = firebase.auth();
    const ready = new Promise((resolve, reject) => {
        let unsubscribe;
        unsubscribe = auth.onAuthStateChanged(user => { resolve(user); unsubscribe?.(); }, reject);
    });
    const labels = {
        ko: ['회사 Google 계정으로 관리자 로그인', '로그아웃', '관리자 계정으로 로그인해 주세요.'],
        en: ['Administrator sign in with Google', 'Sign out', 'Sign in with the administrator account.'],
        ja: ['Googleアカウントで管理者ログイン', 'ログアウト', '管理者アカウントでログインしてください。'],
        zh: ['使用Google账号登录管理员', '退出登录', '请使用管理员账号登录。']
    }[document.documentElement.lang.split('-')[0]] || ['Administrator sign in with Google', 'Sign out', 'Sign in with the administrator account.'];
    root.requireAdminAccess = async function ({ interactive = false } = {}) {
        await ready;
        if (isAdministrator(auth.currentUser)) return auth.currentUser;
        if (!interactive) return null;
        const provider = new firebase.auth.GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account', login_hint: administratorEmail });
        const result = await auth.signInWithPopup(provider);
        if (!isAdministrator(result.user)) {
            await auth.signOut();
            throw new Error(labels[2]);
        }
        return result.user;
    };
    root.getInsightAuthHeaders = async function () {
        const user = await root.requireAdminAccess();
        return user ? { Authorization: 'Bearer ' + await user.getIdToken() } : {};
    };
    document.addEventListener('DOMContentLoaded', () => {
        const panel = document.getElementById('administrator-auth-panel');
        if (!panel) return;
        const message = panel.querySelector('[data-auth-status]');
        const login = panel.querySelector('[data-auth-login]');
        const logout = panel.querySelector('[data-auth-logout]');
        login.textContent = labels[0]; logout.textContent = labels[1];
        auth.onAuthStateChanged(user => {
            const administrator = isAdministrator(user);
            message.textContent = administrator ? user.email : labels[2];
            login.hidden = administrator; logout.hidden = !administrator;
        });
        login.addEventListener('click', async () => {
            login.disabled = true;
            try { await root.requireAdminAccess({ interactive: true }); location.reload(); }
            catch (error) { message.textContent = error.message; login.disabled = false; }
        });
        logout.addEventListener('click', async () => { await auth.signOut(); location.reload(); });
    });
})(typeof window !== 'undefined' ? window : globalThis);
