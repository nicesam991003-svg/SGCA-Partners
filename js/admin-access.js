(function () {
    'use strict';
    window.requestAdminPassword = function () {
        return new Promise(resolve => {
            const language = document.documentElement.lang.split('-')[0];
            const labels = {
                ko: ['관리자 로그인', '비밀번호', '확인', '취소'],
                en: ['Administrator sign in', 'Password', 'Continue', 'Cancel'],
                ja: ['管理者ログイン', 'パスワード', '確認', 'キャンセル'],
                zh: ['管理员登录', '密码', '确认', '取消']
            }[language] || ['Administrator sign in', 'Password', 'Continue', 'Cancel'];
            const dialog = document.createElement('dialog');
            dialog.style.cssText = 'position:fixed;inset:0;margin:auto;border:0;border-radius:12px;padding:28px;max-width:360px;width:calc(100% - 48px);background:white;color:#1b2738;box-shadow:0 12px 48px #0005';
            dialog.innerHTML = '<form><h3></h3><label for="admin-password-input"></label><input id="admin-password-input" name="password" type="password" autocomplete="current-password" required autofocus style="display:block;width:100%;box-sizing:border-box;padding:12px;margin:12px 0 20px;border:1px solid #aab4c0;border-radius:6px;font-size:1rem"><div style="display:flex;justify-content:flex-end;gap:12px"><button type="button" data-cancel></button><button type="submit"></button></div></form>';
            dialog.querySelector('h3').textContent = labels[0];
            dialog.querySelector('label').textContent = labels[1];
            dialog.querySelector('[type=submit]').textContent = labels[2];
            dialog.querySelector('[data-cancel]').textContent = labels[3];
            dialog.querySelectorAll('button').forEach(button => {
                button.style.cssText = 'padding:8px 18px;border:1px solid #1b2738;border-radius:5px;font-size:0.95rem;cursor:pointer;background:white;color:#1b2738';
            });
            dialog.querySelector('[type=submit]').style.cssText += ';background:#1b2738;color:white';
            const input = dialog.querySelector('input');
            const finish = value => {
                input.value = '';
                dialog.close();
                dialog.remove();
                resolve(value);
            };
            dialog.querySelector('form').addEventListener('submit', event => { event.preventDefault(); finish(input.value); });
            dialog.querySelector('[data-cancel]').addEventListener('click', () => finish(null));
            dialog.addEventListener('cancel', event => { event.preventDefault(); finish(null); });
            document.body.appendChild(dialog);
            dialog.showModal();
        });
    };
    window.matchesAdminPassword = async function (password, expectedDigest) {
        const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(password));
        return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('') === expectedDigest;
    };
})();
