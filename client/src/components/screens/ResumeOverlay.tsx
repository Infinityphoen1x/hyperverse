import { motion } from "framer-motion";

interface ResumeOverlayProps {
  visible: boolean;
  opacity: number;
}

export function ResumeOverlay({ visible, opacity }: ResumeOverlayProps) {
  if (!visible) return null;
  return (
    <motion.div
      className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
      initial={{ opacity: 0 }}
      animate={{ opacity }}
      transition={{ duration: 0 }}
    />
  );
}
