export const languages=[{code:'ko',label:'한국어'},{code:'en',label:'English'},{code:'zh-CN',label:'简体中文'},{code:'ja',label:'日本語'}];
export const messages={
 ko:{login:'로그인',signup:'회원가입',wallet:'내 이용권',username:'ID',password:'비밀번호',confirm:'비밀번호 확인',email:'인증 이메일',nickname:'닉네임',messenger:'상담 메신저',messengerId:'메신저 ID',none:'메신저 없음',logout:'로그아웃',findId:'ID 찾기',reset:'비밀번호 재설정',simulation:'격리 체험 · 실제 메일·청구·VPN 연결 없음'},
 en:{login:'Log in',signup:'Sign up',wallet:'My pass',username:'Username',password:'Password',confirm:'Confirm password',email:'Verification email',nickname:'Nickname',messenger:'Support messenger',messengerId:'Messenger ID',none:'No messenger',logout:'Log out',findId:'Find username',reset:'Reset password',simulation:'Isolated demo · No real email, charges or VPN connection'},
 'zh-CN':{login:'登录',signup:'注册',wallet:'我的套餐',username:'用户名',password:'密码',confirm:'确认密码',email:'验证邮箱',nickname:'昵称',messenger:'咨询聊天软件',messengerId:'聊天账号',none:'不使用聊天软件',logout:'退出登录',findId:'找回用户名',reset:'重置密码',simulation:'隔离测试 · 不发送真实邮件、不扣费、不连接 VPN'},
 ja:{login:'ログイン',signup:'会員登録',wallet:'利用券',username:'ユーザーID',password:'パスワード',confirm:'パスワードの確認',email:'認証用メールアドレス',nickname:'ニックネーム',messenger:'問い合わせ用メッセンジャー',messengerId:'メッセンジャーID',none:'利用しない',logout:'ログアウト',findId:'IDを確認',reset:'パスワードを再設定',simulation:'分離テスト · 実際のメール送信・請求・VPN接続はありません'}
};
export function language(value){return languages.some(item=>item.code===value)?value:'ko';}
export function translate(locale,key){const selected=language(locale);if(!Object.hasOwn(messages.ko,key))throw Error('Unknown translation key');return messages[selected][key];}
