import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="w-full py-8 mt-12 border-t border-navy-800 bg-navy-900/50">
      <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-8 text-slate-400 text-sm">
        <div>
          <h3 className="text-gold-400 font-serif font-bold text-lg mb-4">TẠO VĂN BẢN THÀNH GIỌNG NÓI</h3>
          <p className="leading-relaxed">
            Dự án phát triển công cụ Text-to-Speech chất lượng cao, phục vụ cộng đồng người Việt.
            Mang lại trải nghiệm âm thanh sống động và tự nhiên nhất.
          </p>
        </div>
        
        <div>
          <h3 className="text-gold-400 font-serif font-bold text-lg mb-4">Liên Hệ & Hỗ Trợ</h3>
          <ul className="space-y-2">
            <li>
              <a href="#" className="hover:text-gold-400 transition-colors flex items-center gap-2">
                <i className="fab fa-facebook text-blue-500"></i> Nhóm FB giao lưu
              </a>
            </li>
            <li>
              <a href="#" className="hover:text-gold-400 transition-colors flex items-center gap-2">
                <i className="fas fa-comment-dots text-green-500"></i> Nhóm Zalo hỗ trợ
              </a>
            </li>
            <li>
              <a href="#" className="hover:text-gold-400 transition-colors flex items-center gap-2">
                <i className="fab fa-youtube text-red-500"></i> Youtube
              </a>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-gold-400 font-serif font-bold text-lg mb-4">Nhà Phát Triển</h3>
          <p className="mb-1 text-slate-200 font-medium text-base">Nguyễn Văn Thành</p>
          <p className="mb-4 text-gold-500/80">Gv trường THCS Ngãi Tứ</p>
          <p className="text-xs text-slate-500">
            Powered by Gemini 2.5 Flash TTS<br/>
            &copy; {new Date().getFullYear()} TẠO VĂN BẢN THÀNH GIỌNG NÓI. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;