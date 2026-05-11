import { motion } from 'motion/react';
import { Mail } from 'lucide-react';

export default function Contact() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
        className="space-y-8"
      >
        <div className="space-y-4">
          <h1 className="text-6xl font-semibold tracking-tight text-white mb-2">Lets Connect</h1>
          <div className="w-12 h-1 bg-brand-yellow mx-auto rounded-full"></div>
        </div>
        <p className="text-zinc-400 text-lg font-medium max-w-md mx-auto">
          If you have any questions or want to collaborate
        </p>
        
        <div className="pt-8">
          <a 
            href="https://mail.google.com/mail/?view=cm&fs=1&to=kriebusines@gmail.com"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary py-4 px-10 text-lg font-semibold inline-flex items-center gap-3 rounded-xl shadow-xl shadow-brand-cyan/10 hover:shadow-brand-cyan/20 cursor-pointer"
          >
            <Mail className="w-5 h-5" />
            kriebusines@gmail.com
          </a>
        </div>
      </motion.div>
    </div>
  );
}
