/* Preserve the existing page navigation; only complete missing sidebar footer. */
(()=>{
'use strict';
const sidebar=document.getElementById('sidebar');
if(!sidebar||sidebar.querySelector('.side-bottom'))return;
const footer=document.createElement('div');
footer.className='side-bottom';
footer.innerHTML='<div class="mini-pl"><div class="mini-pl-icon">PL</div><b>Польский — каждый день.</b><p>Маленькие шаги приводят к большим результатам.</p><a href="https://www.youtube.com/@polskij-wsluh" target="_blank" rel="noopener noreferrer">На YouTube ↗</a></div><small>Независимый учебный каталог · YouTube</small>';
sidebar.append(footer);
})();